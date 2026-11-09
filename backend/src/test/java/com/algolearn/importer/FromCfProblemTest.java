package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.codeforces.dto.CfProblem;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Ports legacy fromCfProblem.test.js. */
class FromCfProblemTest {

    @Test
    void mapsACfApiProblemToACfApiDocumentWithoutStatementText() {
        var doc = FromCfProblem.map(new CfProblem(2050, "G", " Tree Destruction ", "PROGRAMMING", 1900,
                List.of("dfs and similar", "dp", "trees")));
        assertThat(doc).isEqualTo(new ProblemDoc("2050/G", 2050, "G", "Tree Destruction", "", "", "", "", "", 1900,
                List.of("dfs and similar", "dp", "trees"), 3, false, "cf_api"));
    }

    @Test
    void keepsAMissingRatingAsNullAndDedupesTags() {
        var doc = FromCfProblem.map(new CfProblem(1, "A", "X", null, null, List.of("dp", "dp")));
        assertThat(doc.rating()).isNull();
        assertThat(doc.tags()).containsExactly("dp");
        assertThat(doc.tagCount()).isEqualTo(1);
    }

    @Test
    void dropsTagsThatAreNotInTheKnown37InsteadOfRejectingTheProblem() {
        assertThat(FromCfProblem.map(new CfProblem(1, "A", "X", null, null, List.of("dp", "quantum"))).tags())
                .containsExactly("dp");
    }

    @Test
    void producesAnInvalidIdLaterRejectedWhenContestIdIsMissing() {
        assertThat(FromCfProblem.map(new CfProblem(null, "A", "X", null, null, null)).id()).isEqualTo("null/A");
        var empty = FromCfProblem.map(null);
        assertThat(empty.id()).isEqualTo("null/");
        assertThat(empty.tags()).isEmpty();
    }
}
