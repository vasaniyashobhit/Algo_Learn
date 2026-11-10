package com.algolearn.llm.chain;

import java.util.function.Supplier;

/**
 * Runs one provider call with a hard time limit (legacy withTimeout): returns its value, re-throws its
 * failure, or throws {@link LlmException#timeout} once {@code limitMs} passes, even if the call ignores it.
 */
@FunctionalInterface
public interface TimeLimiter {

    <T> T call(long limitMs, Supplier<T> task);
}
