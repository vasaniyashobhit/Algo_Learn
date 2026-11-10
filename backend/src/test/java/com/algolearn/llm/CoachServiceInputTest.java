package com.algolearn.llm;

import static com.algolearn.llm.LlmFakes.coachJson;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.LlmFakes.FakeCache;
import com.algolearn.llm.cache.CoachCache;
import com.algolearn.llm.chain.ChainSettings;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Ports the input, cache-key and unexpected-error cases of legacy coach.service.*.test.js. */
class CoachServiceInputTest {

    private static final String TEXT = "Theatre Square: cover an n × m square with a × a flagstones.";

    private final ChainSettings settings = LlmFakes.settings(LlmFakes.clockAt(0));

    @Test
    void returnsNoInputWithoutCallingProvidersForEmptyInput() {
        var a = FakeProvider.of("gemini", "a", coachJson());
        var coach = new CoachService(List.of(a), new FakeCache(), settings);
        assertThat(coach.getCoachAnswer(CoachRequest.ofText("  \n ")).reason()).isEqualTo(FallbackReason.NO_INPUT);
        assertThat(coach.getCoachAnswer(new CoachRequest("1/A", null, null, null)).reason())
                .isEqualTo(FallbackReason.NO_INPUT);
        assertThat(coach.getCoachAnswer(null)).isEqualTo(CoachResult.fallback(FallbackReason.NO_INPUT));
        assertThat(a.jsonCalls).isZero();
    }

    @Test
    void keysFreeTextByItsNormalizedHashSoWhitespaceChangesHitTheCache() {
        var gemini = FakeProvider.of("gemini", "a", coachJson());
        var coach = new CoachService(List.of(gemini), new FakeCache(), settings);
        coach.getCoachAnswer(CoachRequest.ofText(TEXT));
        var second = coach.getCoachAnswer(CoachRequest.ofText("  " + TEXT.replace(" ", "\n  ") + "\r\n"));
        assertThat(second.source()).isEqualTo("cache");
        assertThat(gemini.jsonCalls).isEqualTo(1);
    }

    @Test
    void turnsAnUnexpectedInternalErrorIntoTheFallbackAndLogsIt() {
        CoachCache broken = new CoachCache() {
            @Override
            public Optional<CachedAnswer> get(String key) {
                throw new IllegalStateException("boom");
            }

            @Override
            public void set(String key, CachedAnswer value) {
                // never reached
            }
        };
        try (var logs = new LogCapture(CoachService.class)) {
            var result = new CoachService(List.of(), broken, settings).getCoachAnswer(CoachRequest.ofText(TEXT));
            assertThat(result).isEqualTo(CoachResult.fallback(FallbackReason.AI_UNAVAILABLE));
            assertThat(logs.messages("ERROR")).hasSize(1);
        }
    }

    @Test
    void saysAiUnavailableWhenNoProviderIsConfigured() {
        var result = new CoachService(List.of(), new FakeCache(), settings).getCoachAnswer(CoachRequest.ofText(TEXT));
        assertThat(result.reason()).isEqualTo(FallbackReason.AI_UNAVAILABLE);
    }
}
