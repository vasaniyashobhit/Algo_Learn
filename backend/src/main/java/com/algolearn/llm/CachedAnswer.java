package com.algolearn.llm;

/** A coach answer with the provider and model that wrote it (what the cache stores). */
public record CachedAnswer(CoachAnswer answer, String provider, String model) {
}
