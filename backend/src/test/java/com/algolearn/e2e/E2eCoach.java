package com.algolearn.e2e;

import com.algolearn.llm.CachedAnswer;
import com.algolearn.llm.cache.CoachCache;
import com.algolearn.llm.chain.LlmException;
import com.algolearn.llm.provider.LlmProvider;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The fake AI provider (legacy e2e/server/fakeLlm.js): answers instantly with one fixed coach answer, and fails
 * (HTTP 400) when the prompt contains {@link #AI_OUTAGE_MARKER}, so the fallback path can be tested.
 */
class E2eCoach implements LlmProvider {

    /** Stuck text containing this marker makes the fake AI fail. */
    static final String AI_OUTAGE_MARKER = "AI-OUTAGE";
    static final int OUTAGE_STATUS = 400;

    static final String ANSWER = """
            {"tags":["greedy","strings"],"estimatedRating":1300,"hints":[\
            "Walk the string once and track how many brackets are still open.",\
            "A part can end exactly where that running balance returns to zero.",\
            "Cut at every zero; if the balance ever drops below zero or ends above it, the answer is -1."],\
            "approach":"Greedy: every time the prefix balance hits 0, close the current part.",\
            "solutionSteps":["Read s","Keep a balance counter","Count the zeros; check it never goes negative"],\
            "complexity":"O(n) time, O(1) memory",\
            "code":"#include <bits/stdc++.h>\\nint main() { std::string s; std::cin >> s; }",\
            "pitfalls":["A string that ends with a positive balance has no valid split"]}""";

    @Override
    public String name() {
        return "fake";
    }

    @Override
    public String model() {
        return "e2e-coach";
    }

    @Override
    public String generateJson(String prompt) {
        if (prompt.contains(AI_OUTAGE_MARKER)) {
            throw new LlmException("Fake AI outage (E2E)", OUTAGE_STATUS, null, null);
        }
        return ANSWER;
    }

    @Override
    public String extractTextFromImage(byte[] image, String mimeType) {
        return "";
    }

    /** The legacy E2E server cached coach answers in memory, not in the database. */
    static final class MemoryCache implements CoachCache {

        private final Map<String, CachedAnswer> store = new ConcurrentHashMap<>();

        @Override
        public Optional<CachedAnswer> get(String key) {
            return Optional.ofNullable(store.get(key));
        }

        @Override
        public void set(String key, CachedAnswer value) {
            store.put(key, value);
        }
    }
}
