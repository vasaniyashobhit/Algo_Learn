package com.algolearn.stats;

import com.algolearn.common.web.IsoTime;
import com.algolearn.stats.calc.BuildSummary;
import com.algolearn.stats.calc.BuildTopicStats;
import com.algolearn.stats.calc.GroupByProblem;
import com.algolearn.stats.calc.TopicStatDoc;
import com.algolearn.stats.dto.StatsMeta;
import com.algolearn.stats.dto.Summary;
import com.algolearn.stats.dto.SummaryMeta;
import com.algolearn.stats.dto.TopicStatView;
import com.algolearn.users.User;
import com.algolearn.users.UserRepository;
import com.algolearn.users.UsersService;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * recomputeForUser (full rebuild from submissions; stale keys deleted), getStats (one kind, sorted,
 * limited) and getSummary (dashboard). No handle → empty data plus {@code meta.reason}.
 */
@Service
public class StatsService {

    private final UserRepository users;
    private final StatsQueries queries;
    private final TopicStatWriter writer;
    private final Clock clock;

    public StatsService(UserRepository users, StatsQueries queries, TopicStatWriter writer, Clock clock) {
        this.users = users;
        this.queries = queries;
        this.writer = writer;
        this.clock = clock;
    }

    /** Rewrites every topic_stats row of the user in one transaction. */
    @Transactional
    public RecomputeResult recomputeForUser(UUID userId) {
        var user = load(userId);
        var problems = GroupByProblem.group(queries.submissions(userId));
        var now = clock.instant();
        var docs = BuildTopicStats.build(problems, user.getCfRating(), now);
        var removed = writer.deleteStale(userId, docs.stream().map(TopicStatDoc::topicKey).toList());
        writer.upsert(userId, docs, now);
        var singles = (int) docs.stream().filter(d -> "single".equals(d.kind())).count();
        return new RecomputeResult(singles, docs.size() - singles, removed);
    }

    @Transactional(readOnly = true)
    public StatsPage getStats(UUID userId, StatsQuery query) {
        var user = load(userId);
        var reason = EmptyReason.of(user.getCfHandle(), user.getLastSyncedAt()).orElse(null);
        var synced = iso(user.getLastSyncedAt());
        if (user.getCfHandle() == null) {
            var meta = new StatsMeta(query.kind(), query.sort(), query.limit(), 0, synced, reason);
            return new StatsPage(List.of(), meta);
        }
        var items = queries.page(userId, query.kind(), query.sort(), query.limit()).stream()
                .map(TopicStatView::of).toList();
        var total = queries.count(userId, query.kind());
        return new StatsPage(items, new StatsMeta(query.kind(), query.sort(), query.limit(), total, synced, reason));
    }

    @Transactional(readOnly = true)
    public SummaryPage getSummary(UUID userId) {
        var user = load(userId);
        var meta = new SummaryMeta(user.getCfHandle(), user.getCfRating(), iso(user.getLastSyncedAt()),
                EmptyReason.of(user.getCfHandle(), user.getLastSyncedAt()).orElse(null));
        var now = clock.instant();
        if (user.getCfHandle() == null) {
            return new SummaryPage(BuildSummary.build(List.of(), List.of(), now), meta);
        }
        return new SummaryPage(BuildSummary.build(queries.submissions(userId), queries.all(userId), now), meta);
    }

    private User load(UUID userId) {
        return users.findById(userId).orElseThrow(UsersService::accountGone);
    }

    private static String iso(Instant instant) {
        return instant == null ? null : IsoTime.format(instant);
    }

    /** What a recompute wrote: single and pair rows, and how many stale rows were deleted. */
    public record RecomputeResult(int singles, int pairs, int removed) {
    }

    /** One page of topic stats and its meta. */
    public record StatsPage(List<TopicStatView> items, StatsMeta meta) {
    }

    /** The summary and its meta. */
    public record SummaryPage(Summary data, SummaryMeta meta) {
    }
}
