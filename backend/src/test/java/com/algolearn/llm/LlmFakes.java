package com.algolearn.llm;

import com.algolearn.llm.cache.CoachCache;
import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.llm.chain.CircuitBreaker;
import com.algolearn.llm.chain.LlmException;
import com.algolearn.llm.chain.MinuteBudget;
import com.algolearn.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import tools.jackson.databind.json.JsonMapper;

/** Shared LLM test data and doubles (legacy tests/helpers/llm.js). */
public final class LlmFakes {

    public static final JsonMapper MAPPER = JsonMapper.builder().build();
    /** A program that passes the C++ shape check. */
    public static final String CODE = String.join("\n", "#include <cstdio>", "int main() {}");

    private LlmFakes() {
    }

    /** A raw model answer that passes the coach schema; {@code overrides} replace or add keys. */
    public static String coachJson(Map<String, Object> overrides) {
        var body = new LinkedHashMap<String, Object>();
        body.put("tags", List.of("math", "implementation"));
        body.put("estimatedRating", 1000);
        body.put("hints", List.of("Think about each side separately", "Round up", "Multiply the two counts"));
        body.put("approach", "Count ceil(n/a) · ceil(m/a).");
        body.put("solutionSteps", List.of("Read n, m, a", "Print the product"));
        body.put("complexity", "O(1) time, O(1) memory");
        body.put("code", CODE);
        body.put("pitfalls", List.of("Use 64-bit integers"));
        body.putAll(overrides);
        return MAPPER.writeValueAsString(body);
    }

    public static String coachJson() {
        return coachJson(Map.of());
    }

    public static LlmException httpError(int status) {
        return new LlmException("HTTP " + status, status, null, null);
    }

    /** A clock fixed at {@code millis} (epoch ms). */
    public static MutableClock clockAt(long millis) {
        var clock = new MutableClock();
        clock.set(Instant.ofEpochMilli(millis));
        return clock;
    }

    /** Settings with an open budget, no real waiting (the sleeper records and advances the clock). */
    public static ChainSettings settings(MutableClock clock, List<Long> sleeps, long timeoutMs) {
        return new ChainSettings(clock, new MinuteBudget(key -> Integer.MAX_VALUE, 60_000, clock),
                CircuitBreaker.defaults(clock), new FakeLimiter(clock), ms -> {
                    sleeps.add(ms);
                    clock.advance(Duration.ofMillis(ms));
                }, 2, 1_000, timeoutMs, 40_000);
    }

    public static ChainSettings settings(MutableClock clock) {
        return settings(clock, new ArrayList<>(), 50);
    }

    public static MinuteBudget closedBudget(MutableClock clock) {
        return new MinuteBudget(key -> 0, 60_000, clock);
    }

    /** In-memory cache with the CoachCache interface, counting writes. */
    public static final class FakeCache implements CoachCache {
        public final Map<String, CachedAnswer> store = new HashMap<>();
        public final List<String> written = new ArrayList<>();

        @Override
        public Optional<CachedAnswer> get(String key) {
            return Optional.ofNullable(store.get(key));
        }

        @Override
        public void set(String key, CachedAnswer value) {
            written.add(key);
            store.put(key, value);
        }
    }
}
