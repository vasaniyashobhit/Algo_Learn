package com.algolearn.llm;

import static com.algolearn.llm.LlmFakes.coachJson;
import static com.algolearn.llm.LlmFakes.httpError;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.LlmFakes.FakeCache;
import com.algolearn.llm.chain.CallOutcome.Failed;
import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.support.MutableClock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Ports legacy coach.service.deadline.test.js. */
class CoachServiceDeadlineTest {

    private static final String TEXT = "Some problem statement.";

    private final MutableClock clock = LlmFakes.clockAt(1_000);

    private CoachService service(ChainSettings settings, FakeProvider... providers) {
        return new CoachService(List.of(providers), new FakeCache(), settings);
    }

    @Test
    void returnsAiTimeoutAndTriesNoOtherProviderOnceTheDeadlinePasses() {
        var b = FakeProvider.of("gemini", "b", coachJson());
        var coach = service(LlmFakes.settings(clock, new ArrayList<>(), 5_000),
                FakeProvider.of("gemini", "a", FakeProvider.HANG), b);
        var result = coach.getCoachAnswer(new CoachRequest(null, TEXT, null, Instant.ofEpochMilli(1_020)));
        assertThat(result).isEqualTo(CoachResult.fallback(FallbackReason.AI_TIMEOUT));
        assertThat(b.jsonCalls).isZero();
        assertThat(clock.millis()).isEqualTo(1_020);
    }

    @Test
    void defaultsTheDeadlineToNowPlusDeadlineMs() {
        var a = FakeProvider.of("gemini", "a", coachJson());
        var zero = LlmFakes.settings(clock).withTimeouts(50, 0);
        assertThat(service(zero, a).getCoachAnswer(CoachRequest.ofText(TEXT)).reason())
                .isEqualTo(FallbackReason.AI_TIMEOUT);
        assertThat(a.jsonCalls).isZero();
        var limiter = new FakeLimiter(clock);
        var standard = new ChainSettings(clock, zero.budget(), zero.breaker(), limiter, zero.sleeper(), 2, 1_000,
                25_000, 40_000);
        assertThat(service(standard, a).getCoachAnswer(CoachRequest.ofText(TEXT)).source()).isEqualTo("ai");
        assertThat(limiter.limits).containsExactly(25_000L);
    }

    @Test
    void skipsAModelThatAnswered503OnTheNextRequest() {
        var settings = LlmFakes.settings(clock);
        var a = FakeProvider.of("gemini", "a", httpError(503));
        var coach = service(settings, a, FakeProvider.of("groq", "g", coachJson()));
        assertThat(coach.getCoachAnswer(CoachRequest.ofText(TEXT)).provider()).isEqualTo("groq");
        assertThat(coach.getCoachAnswer(CoachRequest.ofText(TEXT + " again")).provider()).isEqualTo("groq");
        assertThat(a.jsonCalls).isEqualTo(1);
    }

    @Test
    void saysAiUnavailableWhenEveryCircuitIsOpen() {
        var settings = LlmFakes.settings(clock);
        settings.breaker().trip("gemini:a");
        var result = service(settings, FakeProvider.of("gemini", "a", coachJson())).getCoachAnswer(
                CoachRequest.ofText(TEXT));
        assertThat(result.reason()).isEqualTo(FallbackReason.AI_UNAVAILABLE);
    }

    @Test
    void reasonOfFollowsTheLegacyPriority() {
        assertThat(CoachService.reasonOf(List.of(Failed.BUSY, Failed.TIMEOUT))).isEqualTo(FallbackReason.AI_TIMEOUT);
        assertThat(CoachService.reasonOf(List.of(Failed.BUSY, Failed.BUSY))).isEqualTo(FallbackReason.AI_BUSY);
        assertThat(CoachService.reasonOf(List.of(Failed.BUSY, Failed.OPEN))).isEqualTo(FallbackReason.AI_UNAVAILABLE);
        assertThat(CoachService.reasonOf(List.of())).isEqualTo(FallbackReason.AI_UNAVAILABLE);
    }
}
