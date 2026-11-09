package com.algolearn.sync;

import com.algolearn.codeforces.CfCalls;
import com.algolearn.codeforces.CodeforcesClient;
import com.algolearn.codeforces.dto.CfUser;
import com.algolearn.common.db.SqlTime;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.RateLimitException;
import com.algolearn.common.error.ValidationException;
import com.algolearn.common.web.IsoTime;
import java.time.Clock;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * syncUser: pulls new Codeforces submissions under the per-user lock (always released), refreshes
 * the rating, then calls {@code onSynced(userId)} (the stats recompute). Refuses with RATE_LIMITED
 * within the cooldown of lastSyncedAt unless {@code ignoreCooldown} (the background job).
 * {@code pending} lists submissions still being judged (they are not stored). Built by {@link SyncConfig}.
 */
public class SyncService {

    private final CodeforcesClient client;
    private final SyncLock lock;
    private final SubmissionWriter writer;
    private final JdbcTemplate jdbc;
    private final Consumer<UUID> onSynced;
    private final Clock clock;
    private final SyncSettings settings;

    public SyncService(CodeforcesClient client, SyncLock lock, SubmissionWriter writer, JdbcTemplate jdbc,
            Consumer<UUID> onSynced, Clock clock, SyncSettings settings) {
        this.client = client;
        this.lock = lock;
        this.writer = writer;
        this.jdbc = jdbc;
        this.onSynced = onSynced;
        this.clock = clock;
        this.settings = settings;
    }

    public SyncResult syncUser(UUID userId) {
        return syncUser(userId, false);
    }

    public SyncResult syncUser(UUID userId, boolean ignoreCooldown) {
        var startedAt = clock.instant();
        var user = lock.acquire(userId, startedAt, settings.lockMs());
        try {
            if (user.cfHandle() == null) {
                throw new ValidationException(ErrorCode.CF_HANDLE_NOT_LINKED,
                        "Link a Codeforces handle before syncing");
            }
            var leftMs = ignoreCooldown ? 0 : Cooldown.leftMs(user.lastSyncedAt(), startedAt, settings.cooldownMs());
            if (leftMs > 0) {
                throw new RateLimitException(ErrorCode.RATE_LIMITED,
                        "This account was synced a moment ago, try again shortly",
                        Map.of("retryAfterSeconds", (long) Math.ceil(leftMs / 1000.0)));
            }
            return run(user);
        } finally {
            lock.release(userId);
        }
    }

    private SyncResult run(SyncLock.SyncUser user) {
        var fetched = CfSubmissions.uniqueById(CfCalls.call(() -> SubmissionPager.fetch(client, user.cfHandle(),
                user.lastSubmissionId(), settings.pageSize(), settings.maxPages())).submissions());
        var rows = fetched.stream().filter(CfSubmissions::isStorable).map(CfSubmissions::toRow).toList();
        var inserted = writer.insertIgnoringDuplicates(user.id(), rows, clock.instant());
        var cursor = CfSubmissions.nextCursor(fetched, user.lastSubmissionId());
        var pending = CfSubmissions.pendingRefs(fetched);
        var infos = CfCalls.call(() -> client.userInfo(user.cfHandle()));
        var info = infos == null || infos.isEmpty() ? new CfUser(null, null, null) : infos.getFirst();
        var lastSyncedAt = clock.instant();
        jdbc.update("UPDATE users SET cf_rating = ?, cf_max_rating = ?, last_synced_at = ?, last_submission_id = ?, "
                + "updated_at = ? WHERE id = ?", info.rating(), info.maxRating(), SqlTime.of(lastSyncedAt), cursor,
                SqlTime.of(lastSyncedAt), user.id());
        onSynced.accept(user.id());
        return new SyncResult(inserted, writer.countForUser(user.id()), IsoTime.format(lastSyncedAt), pending);
    }
}
