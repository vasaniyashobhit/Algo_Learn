package com.algolearn.llm.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.config.Tags;
import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** Ports legacy buildCoachPrompt.test.js. */
class CoachPromptTest {

    private final String prompt = CoachPrompt.build("Count the flagstones.",
            List.of("math", "math", "*special", "nope"));

    @Test
    void includesTheProblemTextBetweenMarkers() {
        assertThat(prompt).contains("\"\"\"\nCount the flagstones.\n\"\"\"");
    }

    @Test
    void listsEveryOfficialTopicTagAndNoSpecial() {
        Tags.TOPIC_TAGS.forEach(tag -> assertThat(prompt).contains(tag));
        assertThat(prompt).doesNotContain("*special");
    }

    @Test
    void mentionsOnlyValidKnownTags() {
        assertThat(prompt).contains("Known tags for this problem: math. Use them unless they are clearly wrong.");
    }

    @Test
    void asksForJsonOnlyWithEveryField() {
        assertThat(prompt).contains("JSON object only");
        for (var field : List.of("tags", "estimatedRating", "hints", "approach", "solutionSteps", "complexity",
                "code", "pitfalls")) {
            assertThat(prompt).contains("\"" + field + "\"");
        }
        assertThat(prompt).contains("C++17").contains("exactly 3 short progressive hints")
                .contains("800 to 3500, a multiple of 100");
    }

    @Test
    void framesTheRequestAsUpsolvingPracticeNeverLiveContests() {
        assertThat(prompt).contains("upsolving for practice")
                .contains("never for a live rated contest or an assessment");
    }

    @Test
    void asksToInferTagsWhenNoneAreKnown() {
        assertThat(CoachPrompt.build("x", List.of())).contains("No tags are known for this problem: infer them.");
    }

    @Test
    void truncatesVeryLongStatementsTo20000Characters() {
        var longPrompt = CoachPrompt.build("y".repeat(30_000), List.of(), List.of("dp"));
        var run = Pattern.compile("y{100,}").matcher(longPrompt);
        assertThat(run.find()).isTrue();
        assertThat(run.group()).hasSize(20_000);
    }

    @Test
    void writesNullTextLikeJavaScriptString() {
        assertThat(CoachPrompt.build(null, List.of())).contains("\"\"\"\nnull\n\"\"\"");
    }
}
