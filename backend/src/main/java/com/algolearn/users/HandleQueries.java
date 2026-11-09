package com.algolearn.users;

import com.algolearn.codeforces.dto.CfUser;
import com.algolearn.common.db.SqlTime;
import com.algolearn.sync.SyncLock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Native SQL for handle linking. Every user update only matches an unlocked user (no running
 * sync) and returns how many rows it changed (0 = locked or gone).
 */
@Repository
public class HandleQueries {

    private final JdbcTemplate jdbc;

    public HandleQueries(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Another account already holds the handle (any casing, like the uk_users_cf_handle index). */
    public boolean takenByOther(UUID userId, String handle) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM users WHERE "
                + "lower(cf_handle) = lower(?) AND id <> ?)", Boolean.class, handle, userId));
    }

    /** Saves Codeforces' casing and ratings; {@code resetSync} also clears lastSyncedAt/lastSubmissionId. */
    public int link(UUID userId, CfUser info, boolean resetSync, Instant now) {
        var reset = resetSync ? ", last_synced_at = NULL, last_submission_id = NULL" : "";
        return jdbc.update("UPDATE users SET cf_handle = ?, cf_rating = ?, cf_max_rating = ?, updated_at = ?" + reset
                + " WHERE id = ? AND " + SyncLock.UNLOCKED, info.handle(), info.rating(), info.maxRating(),
                SqlTime.of(now), userId, SqlTime.of(now));
    }

    public int unlink(UUID userId, Instant now) {
        return jdbc.update("UPDATE users SET cf_handle = NULL, cf_rating = NULL, cf_max_rating = NULL, "
                + "last_synced_at = NULL, last_submission_id = NULL, updated_at = ? WHERE id = ? AND "
                + SyncLock.UNLOCKED, SqlTime.of(now), userId, SqlTime.of(now));
    }

    /** Deletes the user's submissions and topic stats (a different or no handle makes them stale). */
    public void deleteSyncedData(UUID userId) {
        jdbc.update("DELETE FROM submissions WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM topic_stats WHERE user_id = ?", userId);
    }
}
