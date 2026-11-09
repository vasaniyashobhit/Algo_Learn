package com.algolearn.problems.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRows;
import com.algolearn.support.Json;
import com.algolearn.support.Problems;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy problemView.test.js. */
class ProblemDetailTest {

    @Test
    void summariesNeverSelectStatementOrEditorialText() {
        assertThat(ProblemRows.SUMMARY_COLUMNS.split(", ")).doesNotContain("description", "editorial", "note",
                "input_format", "output_format");
    }

    @Test
    void summariesHaveTheLegacyKeysAndOnlyCarrySimilarityWhenPresent() {
        var plain = new ProblemSummary("1/A", 1, "A", "Theatre Square", 1000, List.of("math"), true, "hf", null);
        assertThat(Json.MAPPER.writeValueAsString(plain)).isEqualTo("{\"id\":\"1/A\",\"contestId\":1,"
                + "\"index\":\"A\",\"title\":\"Theatre Square\",\"rating\":1000,\"tags\":[\"math\"],"
                + "\"hasEditorial\":true,\"source\":\"hf\"}");
        var scored = new ProblemSummary("1/A", 1, "A", "T", null, List.of(), false, "hf",
                new ProblemSummary.Similarity(1, 1, 1));
        var json = Json.parse(Json.MAPPER.writeValueAsString(scored));
        assertThat(json.get("rating").isNull()).isTrue();
        assertThat(json.get("similarity").propertyNames()).containsExactly("score", "jaccard", "ratingCloseness");
    }

    @Test
    void detailIncludesFullTextAndHasStatement() {
        var problem = Problems.at("1/A", 1000, "math");
        problem.setDescription("Pave it.");
        problem.setEditorial("Ceil.");
        problem.setHasEditorial(true);
        var detail = ProblemDetail.of(problem);
        assertThat(detail.description()).isEqualTo("Pave it.");
        assertThat(detail.editorial()).isEqualTo("Ceil.");
        assertThat(detail.hasStatement()).isTrue();
        assertThat(Json.parse(Json.MAPPER.writeValueAsString(detail)).propertyNames()).containsExactly("id",
                "contestId", "index", "title", "rating", "tags", "hasEditorial", "source", "description",
                "inputFormat", "outputFormat", "note", "editorial", "hasStatement");
        problem.setDescription("  \n ");
        assertThat(ProblemDetail.of(problem).hasStatement()).isFalse();
    }

    @Test
    void fillsDefaultsForRowsWithMissingFields() {
        var stub = Problems.stub("2000/B", null);
        stub.setTags(null);
        stub.setDescription(null);
        stub.setNote(null);
        stub.setSource(null);
        var detail = ProblemDetail.of(stub);
        assertThat(detail.tags()).isEmpty();
        assertThat(detail.source()).isEqualTo("hf");
        assertThat(detail.description()).isEmpty();
        assertThat(detail.note()).isEmpty();
        assertThat(detail.hasStatement()).isFalse();
    }
}
