package com.algolearn.llm.chain;

import static com.algolearn.llm.LlmFakes.httpError;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.FakeProvider;
import com.algolearn.llm.LlmFakes;
import com.algolearn.llm.chain.CallOutcome.Failed;
import org.junit.jupiter.api.Test;

/** Ports the "tries is 0" case of legacy callProvider.test.js, plus an interrupted backoff. */
class ProviderCallLimitsTest {

    private final ChainSettings settings = LlmFakes.settings(LlmFakes.clockAt(1_000));

    private static CallOutcome<String> call(FakeProvider provider, ChainSettings s) {
        return ProviderCall.call(provider, p -> p.generateJson("P"), s, 11_000);
    }

    @Test
    void returnsErrorWhenTriesIsZero() {
        var provider = FakeProvider.of("gemini", "m", "ok");
        assertThat(call(provider, settings.withTries(0))).isEqualTo(CallOutcome.failed(Failed.ERROR));
        assertThat(provider.jsonCalls).isZero();
    }

    @Test
    void anInterruptedBackoffEndsTheProviderWithError() {
        var interrupted = settings.withSleeper(ms -> {
            throw new InterruptedException("stop");
        });
        assertThat(call(FakeProvider.of("gemini", "m", httpError(429)), interrupted))
                .isEqualTo(CallOutcome.failed(Failed.ERROR));
        assertThat(Thread.interrupted()).isTrue();
    }
}
