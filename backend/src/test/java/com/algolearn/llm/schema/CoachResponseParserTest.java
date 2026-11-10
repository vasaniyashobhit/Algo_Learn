package com.algolearn.llm.schema;

import static com.algolearn.llm.LlmFakes.coachJson;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.llm.LlmFakes;
import com.algolearn.llm.chain.LlmException;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Ports legacy coachResponse.schema.test.js. */
class CoachResponseParserTest {

    private static String reasonOf(Runnable action) {
        var error = catchThrowableOfType(LlmException.class, action::run);
        return error == null ? null : error.reason();
    }

    private static String json(Object value) {
        return LlmFakes.MAPPER.writeValueAsString(value);
    }

    @Test
    void parsesAValidAnswerIntoTheSanitizedShape() {
        var answer = CoachResponseParser.parse(coachJson(Map.of("extra", "dropped")));
        assertThat(answer.estimatedRating()).isEqualTo(1000);
        assertThat(answer.tags()).containsExactly("math", "implementation");
        assertThat(answer.code()).isEqualTo(LlmFakes.CODE);
        assertThat(LlmFakes.MAPPER.valueToTree(answer).propertyNames()).containsExactly("tags", "estimatedRating",
                "hints", "approach", "solutionSteps", "complexity", "code", "pitfalls");
    }

    @Test
    void toleratesAJsonFenceAroundTheObject() {
        assertThat(CoachResponseParser.parse("\n```json\n" + coachJson() + "\n```").hints()).hasSize(3);
        assertThat(CoachResponseParser.parse("```JSON " + coachJson() + "```").hints()).hasSize(3);
        assertThat(CoachResponseParser.parse("```\n" + coachJson() + "\n```").hints()).hasSize(3);
    }

    @Test
    void defaultsOptionalFields() {
        var answer = CoachResponseParser.parse(json(Map.of("hints", new String[] {"h"}, "approach", "a")));
        assertThat(answer.tags()).isEmpty();
        assertThat(answer.estimatedRating()).isNull();
        assertThat(answer.solutionSteps()).isEmpty();
        assertThat(answer.complexity()).isEmpty();
        assertThat(answer.code()).isEmpty();
        assertThat(answer.pitfalls()).isEmpty();
    }

    @Test
    void rejectsTextThatIsNotJsonAsInvalidJson() {
        assertThat(reasonOf(() -> CoachResponseParser.parse("Here you go: {\"hints\": ["))).isEqualTo("invalid_json");
        assertThat(reasonOf(() -> CoachResponseParser.parse(null))).isEqualTo("invalid_json");
        assertThat(reasonOf(() -> CoachResponseParser.parse("  "))).isEqualTo("invalid_json");
        assertThat(reasonOf(() -> CoachResponseParser.parse(coachJson() + " trailing"))).isEqualTo("invalid_json");
    }

    @Test
    void rejectsJsonThatMissesTheSchemaAsInvalidSchema() {
        assertThat(reasonOf(() -> CoachResponseParser.parse("[]"))).isEqualTo("invalid_schema");
        assertThat(reasonOf(() -> CoachResponseParser.parse("42"))).isEqualTo("invalid_schema");
        assertThat(reasonOf(() -> CoachResponseParser.parse(json(Map.of("hints", new String[0], "approach", "a")))))
                .isEqualTo("invalid_schema");
        assertThat(reasonOf(() -> CoachResponseParser.parse(coachJson(Map.of("hints", "one string")))))
                .isEqualTo("invalid_schema");
        for (var bad : Map.<String, Object>of("tags", "dp", "estimatedRating", true, "approach", 5,
                "solutionSteps", new int[] {1}, "complexity", 1, "code", false, "pitfalls", Map.of()).entrySet()) {
            assertThat(reasonOf(() -> CoachResponseParser.parse(coachJson(Map.of(bad.getKey(), bad.getValue())))))
                    .as(bad.getKey()).isEqualTo("invalid_schema");
        }
        assertThat(reasonOf(() -> CoachResponseParser.validate(null))).isEqualTo("invalid_schema");
    }

    @Test
    void rejectsAnswersThatBecomeEmptyAfterSanitizing() {
        var blankHints = LlmFakes.MAPPER.valueToTree(Map.of("hints", new String[] {"  "}, "approach", "a"));
        var blankApproach = LlmFakes.MAPPER.valueToTree(Map.of("hints", new String[] {"h"}, "approach", "   "));
        assertThat(reasonOf(() -> CoachResponseParser.validate(blankHints))).isEqualTo("invalid_schema");
        assertThat(reasonOf(() -> CoachResponseParser.validate(blankApproach))).isEqualTo("invalid_schema");
    }

    @Test
    void acceptsANumericStringOrNullRating() {
        assertThat(CoachResponseParser.parse(coachJson(Map.of("estimatedRating", "1500"))).estimatedRating())
                .isEqualTo(1500);
        var nullRating = "{\"hints\":[\"h\"],\"approach\":\"a\",\"estimatedRating\":null}";
        assertThat(CoachResponseParser.parse(nullRating).estimatedRating()).isNull();
    }
}
