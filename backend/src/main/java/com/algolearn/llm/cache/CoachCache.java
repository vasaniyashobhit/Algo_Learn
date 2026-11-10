package com.algolearn.llm.cache;

import com.algolearn.llm.CachedAnswer;
import java.util.Optional;

/**
 * Where coach answers are cached. Part of the LLM fallback chain: implementations never throw (a failed read
 * is a miss, a failed write is skipped).
 */
public interface CoachCache {

    /** A cache that never hits and stores nothing (offline LLM). */
    CoachCache NONE = new CoachCache() {
        @Override
        public Optional<CachedAnswer> get(String key) {
            return Optional.empty();
        }

        @Override
        public void set(String key, CachedAnswer value) {
            // nothing is stored
        }
    };

    Optional<CachedAnswer> get(String key);

    /** Only call with a schema-valid, sanitized answer. */
    void set(String key, CachedAnswer value);
}
