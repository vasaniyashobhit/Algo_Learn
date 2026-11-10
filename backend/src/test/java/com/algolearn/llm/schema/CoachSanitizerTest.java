package com.algolearn.llm.schema;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Ports legacy sanitizeCoachResponse.test.js. */
class CoachSanitizerTest {

    private static CoachSanitizer.Raw raw(List<String> hints, String approach, List<String> steps, String complexity,
            String code, List<String> pitfalls) {
        return new CoachSanitizer.Raw(List.of(), 1000.0, hints, approach, steps, complexity, code, pitfalls);
    }

    @Test
    void keepsOfficialTopicTagsOnlyCaseAndSpaceFixedDeduplicated() {
        assertThat(CoachSanitizer.tags(List.of(" DP ", "dp", "Bitmasks", "segment tree", "*special", "math")))
                .containsExactly("dp", "bitmasks", "math");
    }

    @Test
    void keepsAtMostEightTags() {
        var many = List.of("dp", "math", "greedy", "graphs", "trees", "dsu", "games", "fft", "flows", "hashing");
        assertThat(CoachSanitizer.tags(many)).isEqualTo(many.subList(0, 8));
    }

    @ParameterizedTest
    @CsvSource({"1234,1200", "1250,1300", "799,800", "100,800", "3549,3500", "9000,3500"})
    void clampsAndRoundsNumbers(double input, int expected) {
        assertThat(CoachSanitizer.rating(input)).isEqualTo(expected);
    }

    @Test
    void parsesNumericStringsLikeJavaScriptNumber() {
        assertThat(CoachSanitizer.rating("1650")).isEqualTo(1700);
        assertThat(CoachSanitizer.rating(" 1e3 ")).isEqualTo(1000);
        assertThat(CoachSanitizer.rating(1500)).isEqualTo(1500);
    }

    @Test
    void anythingThatIsNotANumberIsNull() {
        for (var input : new Object[] {null, "", "  ", "hard", Double.NaN, Double.POSITIVE_INFINITY, true}) {
            assertThat(CoachSanitizer.rating(input)).as(String.valueOf(input)).isNull();
        }
    }

    @Test
    void limitsArrayLengthsAndDropsBlankItems() {
        var answer = CoachSanitizer.sanitize(raw(List.of("1", " ", "2", "3", "4"), "a",
                IntStream.range(0, 20).mapToObj(i -> "s" + i).toList(), "", "",
                IntStream.range(0, 10).mapToObj(i -> "p" + i).toList()));
        assertThat(answer.hints()).containsExactly("1", "2", "3");
        assertThat(answer.solutionSteps()).hasSize(12);
        assertThat(answer.pitfalls()).hasSize(8);
    }

    @Test
    void trimsAndCapsStringLengths() {
        var answer = CoachSanitizer.sanitize(raw(List.of("x".repeat(900)), "  " + "a".repeat(5000), List.of(),
                " O(n) ", "\n" + "c".repeat(25_000), List.of()));
        assertThat(answer.approach()).hasSize(4000);
        assertThat(answer.complexity()).isEqualTo("O(n)");
        assertThat(answer.code()).hasSize(20_000);
        assertThat(answer.hints().getFirst()).hasSize(500);
    }

    @Test
    void keepsIndentationInsideCodeAndNeverChecksTheCpp() {
        var answer = CoachSanitizer.sanitize(raw(List.of("h"), "a", List.of(), "", "int main() {\n  return 0;\n}\n",
                List.of()));
        assertThat(answer.code()).isEqualTo("int main() {\n  return 0;\n}");
        var malformed = CoachSanitizer.sanitize(raw(List.of("h"), "a", List.of("step"), "", "#iostream>\nint main(",
                List.of()));
        assertThat(malformed.code()).isEqualTo("#iostream>\nint main(");
        assertThat(malformed.solutionSteps()).containsExactly("step");
    }
}
