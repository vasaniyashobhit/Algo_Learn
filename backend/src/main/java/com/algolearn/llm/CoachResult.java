package com.algolearn.llm;

/**
 * What {@code getCoachAnswer} returns (never throws): {@code source} {@code ai}/{@code cache} with the answer
 * and who wrote it, or {@code fallback} with {@code answer}, {@code provider}, {@code model} null and a reason.
 */
public record CoachResult(CoachAnswer answer, String source, String provider, String model, FallbackReason reason) {

    public static final String AI = "ai";
    public static final String CACHE = "cache";
    public static final String FALLBACK = "fallback";

    public static CoachResult fallback(FallbackReason reason) {
        return new CoachResult(null, FALLBACK, null, null, reason);
    }

    public static CoachResult of(String source, CachedAnswer answer) {
        return new CoachResult(answer.answer(), source, answer.provider(), answer.model(), null);
    }

    public boolean isFallback() {
        return FALLBACK.equals(source);
    }
}
