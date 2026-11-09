package com.algolearn.sync;

import com.algolearn.common.db.SqlTime;
import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ConflictException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.users.UsersService;
import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * The per-user sync lock (legacy sync.lock.js). A lock is free when sync_locked_until is null or
 * not after {@code now}; taking it is one atomic conditional UPDATE, so one of two callers wins.
 */
@Repository
public class SyncLock {

    /** SQL condition for "unlocked at the instant bound to the next placeholder". */
    public static final String UNLOCKED = "(sync_locked_until IS NULL OR sync_locked_until <= ?)";

    private final JdbcTemplate jdbc;

    public SyncLock(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Sets sync_locked_until = now + lockMs if the lock is free; returns the user's sync fields. */
    public SyncUser acquire(UUID userId, Instant now, long lockMs) {
        var rows = jdbc.query("UPDATE users SET sync_locked_until = ?, updated_at = ? WHERE id = ? AND " + UNLOCKED
                + " RETURNING id, cf_handle, last_synced_at, last_submission_id",
                (rs, i) -> new SyncUser(rs.getObject("id", UUID.class), rs.getString("cf_handle"),
                        SqlTime.instant(rs.getTimestamp("last_synced_at")),
                        rs.getObject("last_submission_id", Long.class)),
                SqlTime.of(now.plusMillis(lockMs)), SqlTime.of(now), userId, SqlTime.of(now));
        if (rows.isEmpty()) {
            throw lockedOrGone(userId);
        }
        return rows.getFirst();
    }

    public void release(UUID userId) {
        jdbc.update("UPDATE users SET sync_locked_until = NULL WHERE id = ?", userId);
    }

    /** The error for a conditional update on an unlocked user that matched nothing. */
    public AppException lockedOrGone(UUID userId) {
        var exists = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM users WHERE id = ?)", Boolean.class, userId);
        return Boolean.TRUE.equals(exists)
                ? new ConflictException(ErrorCode.SYNC_IN_PROGRESS, "A sync for this account is already running")
                : UsersService.accountGone();
    }

    /** The user fields a sync needs. */
    public record SyncUser(UUID id, String cfHandle, Instant lastSyncedAt, Long lastSubmissionId) {
    }
}
