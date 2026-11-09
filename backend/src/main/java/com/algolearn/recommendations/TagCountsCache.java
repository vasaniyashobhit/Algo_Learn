package com.algolearn.recommendations;

import com.algolearn.recommendations.calc.TopicFrequency.TagCountRow;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;
import org.springframework.stereotype.Component;

/**
 * Legacy tagCounts.cache.js: the per-rating tag counts, loaded at most once per {@code ttl} (1 hour).
 * Concurrent callers wait for the one load in flight; a failed load is not cached.
 */
@Component
public class TagCountsCache {

    private final TagCountsQueries queries;
    private final Clock clock;
    private final Duration ttl = RecommendationConstants.FREQUENCY_CACHE;
    private final ReentrantLock lock = new ReentrantLock();
    private volatile Entry entry;

    public TagCountsCache(TagCountsQueries queries, Clock clock) {
        this.queries = queries;
        this.clock = clock;
    }

    public List<TagCountRow> get() {
        lock.lock();
        try {
            var current = entry;
            var now = clock.instant();
            if (current != null && Duration.between(current.at(), now).compareTo(ttl) < 0) {
                return current.value();
            }
            var value = List.copyOf(queries.load());
            entry = new Entry(now, value);
            return value;
        } finally {
            lock.unlock();
        }
    }

    public void clear() {
        entry = null;
    }

    private record Entry(Instant at, List<TagCountRow> value) {
    }
}
