package com.algolearn.problems;

import static com.algolearn.problems.ListQueryTest.query;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import com.algolearn.problems.ProblemParams.SimilarParams;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Legacy problems.schema.test.js (problemParamsSchema, similarQuerySchema). */
class ProblemParamsTest {

    @ParameterizedTest
    @CsvSource({"1, A", "1950, F2", "1723, GP1", "921, 01"})
    void acceptsValidIds(String contestId, String index) {
        assertThat(ProblemParams.id(contestId, index)).isEqualTo(contestId + "/" + index);
    }

    @Test
    void upperCasesAndTrimsTheIndex() {
        assertThat(ProblemParams.id("4", "b1")).isEqualTo("4/B1");
        assertThat(ProblemParams.id("4", " b ")).isEqualTo("4/B");
    }

    @ParameterizedTest
    @CsvSource(value = {"0|A|params.contestId", "01|A|params.contestId", "x|A|params.contestId",
        "1|ABCD|params.index", "1|A-1|params.index", "1|''|params.index", "1x|A|params.contestId"}, delimiter = '|')
    void rejectsInvalidIds(String contestId, String index, String field) {
        var error = catchThrowableOfType(ValidationException.class, () -> ProblemParams.id(contestId, index));
        assertThat(((List<?>) error.details()).stream().map(i -> ((FieldIssue) i).field())).containsExactly(field);
    }

    @Test
    void similarDefaultsKTo10AndRatingWindowTo300() {
        assertThat(ProblemParams.similar("1", "a", query())).isEqualTo(new SimilarParams("1/A", 10, 300));
        assertThat(ProblemParams.similar("1", "A", query("k", "30", "ratingWindow", "50")))
                .isEqualTo(new SimilarParams("1/A", 30, 50));
    }

    @Test
    void similarRejectsValuesOutsideTheBoundsParamsFirst() {
        var error = catchThrowableOfType(ValidationException.class,
                () -> ProblemParams.similar("0", "A", query("k", "31", "ratingWindow", "10")));
        assertThat(error.details()).isEqualTo(List.of(
                new FieldIssue("params.contestId", "contestId must be a positive integer"),
                new FieldIssue("query.k", "Too big: expected number to be <=30"),
                new FieldIssue("query.ratingWindow", "Too small: expected number to be >=50")));
        for (var bad : List.of(query("k", "0"), query("ratingWindow", "1001"), query("ratingWindow", "abc"))) {
            assertThat(catchThrowableOfType(ValidationException.class, () -> ProblemParams.similar("1", "A", bad)))
                    .as(bad.toString()).isNotNull();
        }
    }
}
