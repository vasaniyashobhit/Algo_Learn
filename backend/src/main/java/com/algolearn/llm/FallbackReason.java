package com.algolearn.llm;

/** {@code reason} of a {@code source: "fallback"} coach answer (no AI text available, never an error). */
public enum FallbackReason {
    NO_INPUT,
    AI_BUSY,
    AI_UNAVAILABLE,
    AI_TIMEOUT
}
