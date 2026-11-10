package com.algolearn.stuck.input;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.llm.FakeLimiter;
import com.algolearn.llm.LlmFakes;
import com.algolearn.llm.chain.ExecutorTimeLimiter;
import com.algolearn.llm.chain.LlmException;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

/** Legacy ocr.test.js: the hard limit (cap, caller timeout, no time left), trimming, failures. */
class OcrTest {

    private static final byte[] IMAGE = {1, 2, 3};

    @Test
    void trimsTheTextAndCapsTheLimitAt15Seconds() {
        var limiter = new FakeLimiter(LlmFakes.clockAt(0));
        var ocr = new Ocr(image -> " A. Theatre Square \n", limiter);
        assertThat(ocr.recognize(IMAGE, 60_000)).isEqualTo("A. Theatre Square");
        assertThat(ocr.recognize(IMAGE, 6_000)).isEqualTo("A. Theatre Square");
        assertThat(limiter.limits).containsExactly(15_000L, 6_000L);
        assertThat(new Ocr(image -> null, limiter).recognize(IMAGE, 10)).isEmpty();
    }

    @Test
    void timesOutAStuckJobAfterTheLimit() {
        var clock = LlmFakes.clockAt(0);
        var ocr = new Ocr(image -> {
            throw new FakeLimiter.Hang();
        }, new FakeLimiter(clock), 30);
        var error = catchThrowableOfType(LlmException.class, () -> ocr.recognize(IMAGE, 60_000));
        assertThat(error.isTimeout()).isTrue();
        assertThat(clock.millis()).isEqualTo(30);
    }

    @Test
    void failsAtOnceWhenNoTimeIsLeftWithoutStartingOcr() {
        var calls = new AtomicInteger();
        var ocr = new Ocr(image -> {
            calls.incrementAndGet();
            return "x";
        }, new FakeLimiter(LlmFakes.clockAt(0)));
        assertThat(catchThrowableOfType(LlmException.class, () -> ocr.recognize(IMAGE, -5)).isTimeout()).isTrue();
        assertThat(calls).hasValue(0);
    }

    @Test
    void passesEngineFailuresThroughAndClosesItsOwnExecutor() throws Exception {
        var limiter = ExecutorTimeLimiter.virtualThreads();
        try (var ocr = new Ocr(image -> {
            throw new OcrEngine.OcrFailure("not installed", null);
        }, limiter)) {
            assertThat(catchThrowableOfType(OcrEngine.OcrFailure.class, () -> ocr.recognize(IMAGE, 1_000)))
                    .hasMessage("not installed");
        }
        new Ocr(image -> "", new FakeLimiter(LlmFakes.clockAt(0))).close();
    }
}
