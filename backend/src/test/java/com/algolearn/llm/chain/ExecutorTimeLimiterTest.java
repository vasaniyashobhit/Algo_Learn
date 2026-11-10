package com.algolearn.llm.chain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/** Ports legacy withTimeout: value, failure, hard timeout that cancels a call ignoring it. */
class ExecutorTimeLimiterTest {

    private final ExecutorTimeLimiter limiter = ExecutorTimeLimiter.virtualThreads();

    @AfterEach
    void close() {
        limiter.close();
    }

    @Test
    void returnsTheValue() {
        assertThat(limiter.call(1_000, () -> "ok")).isEqualTo("ok");
    }

    @Test
    void rethrowsTheCallsOwnFailure() {
        var failure = new LlmException("boom", 500, null, null);
        assertThatThrownBy(() -> limiter.call(1_000, () -> {
            throw failure;
        })).isSameAs(failure);
    }

    @Test
    void wrapsAnErrorThatIsNotARuntimeException() {
        assertThatThrownBy(() -> limiter.call(1_000, () -> {
            throw new AssertionError("bad");
        })).isInstanceOf(LlmException.class).hasCauseInstanceOf(AssertionError.class);
    }

    @Test
    void timesOutAndInterruptsACallThatNeverEnds() throws InterruptedException {
        var interrupted = new CountDownLatch(1);
        var never = new CountDownLatch(1);
        assertThatThrownBy(() -> limiter.call(20, () -> {
            try {
                never.await();
            } catch (InterruptedException e) {
                interrupted.countDown();
            }
            return "late";
        })).isInstanceOf(LlmException.class).hasMessage("Timed out after 20ms")
                .satisfies(e -> assertThat(((LlmException) e).isTimeout()).isTrue());
        assertThat(interrupted.await(5, TimeUnit.SECONDS)).isTrue();
    }

    @Test
    void anInterruptedCallerGetsAnLlmExceptionAndKeepsTheFlag() {
        Thread.currentThread().interrupt();
        assertThatThrownBy(() -> limiter.call(1_000, () -> {
            try {
                new CountDownLatch(1).await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return "x";
        })).isInstanceOf(LlmException.class).extracting(e -> ((LlmException) e).reason()).isEqualTo("interrupted");
        assertThat(Thread.interrupted()).isTrue();
    }
}
