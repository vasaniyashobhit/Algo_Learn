package com.algolearn.llm.chain;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

/**
 * {@link TimeLimiter} on an executor: waits at most the limit, then cancels (interrupts) the call. Owns the
 * executor ({@link #close} shuts it down), so it is never exposed as an application Executor bean.
 */
public class ExecutorTimeLimiter implements TimeLimiter, AutoCloseable {

    private final ExecutorService executor;

    public ExecutorTimeLimiter(ExecutorService executor) {
        this.executor = executor;
    }

    /** One virtual thread per call. */
    public static ExecutorTimeLimiter virtualThreads() {
        return new ExecutorTimeLimiter(Executors.newVirtualThreadPerTaskExecutor());
    }

    @Override
    public void close() {
        executor.shutdownNow();
    }

    @Override
    public <T> T call(long limitMs, Supplier<T> task) {
        var future = executor.submit(task::get);
        try {
            return future.get(limitMs, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw LlmException.timeout(limitMs);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof RuntimeException failure) {
                throw failure;
            }
            throw new LlmException("The provider call failed", null, null, e.getCause());
        } catch (InterruptedException e) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            throw new LlmException("Interrupted while waiting for the provider", null, "interrupted", e);
        }
    }
}
