package com.algolearn.problems;

import static com.algolearn.support.Problems.at;
import static com.algolearn.support.Problems.stub;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.problems.ProblemService.PageMeta;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Json;
import com.algolearn.support.ProblemDatabaseTest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy problems.list.service.test.js. */
class ProblemsListIT extends ProblemDatabaseTest {

    private final ProblemService service;

    ProblemsListIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            ProblemService service) {
        super(mvc, jdbc, problems, search);
        this.service = service;
    }

    @BeforeEach
    void seedProblems() {
        var theatre = at("1/A", 800, "math");
        theatre.setTitle("Theatre Square");
        theatre.setDescription("Flagstones on a square.");
        var grid = at("1/B", 1600, "dp", "math");
        grid.setDescription("Count paths in a grid.");
        var prefix = at("2/A", 1200, "dp");
        prefix.setEditorial("Use prefix sums.");
        seed(theatre, grid, prefix, at("3/C", null, "graphs"), stub("4/A", 1300, "dp"));
    }

    private ProblemService.Page list(List<String> tags, boolean all, Integer min, Integer max, String q, int page,
            int limit) {
        return service.list(new ListQuery(tags, all, min, max, q, page, limit));
    }

    @Test
    void listsNewestContestFirstWithPagingMetaAndNoStatementText() throws Exception {
        var page = list(List.of(), false, null, null, null, 1, 20);
        assertThat(ids(page.items())).containsExactly("4/A", "3/C", "2/A", "1/A", "1/B");
        assertThat(page.meta()).isEqualTo(new PageMeta(1, 20, 5, 1));
        var json = Json.body(mvc.perform(get("/api/v1/problems")));
        json.get("data").forEach(item -> assertThat(item.has("description") || item.has("editorial")).isFalse());
    }

    @Test
    void pagesThroughResultsKeepingTheTotal() {
        var page = list(List.of(), false, null, null, null, 2, 2);
        assertThat(ids(page.items())).containsExactly("2/A", "1/A");
        assertThat(page.meta()).isEqualTo(new PageMeta(2, 2, 5, 3));
        var past = list(List.of(), false, null, null, null, 9, 2);
        assertThat(past.items()).isEmpty();
        assertThat(past.meta().total()).isEqualTo(5);
    }

    @Test
    void capsTheLimitAt50() {
        assertThat(list(List.of(), false, null, null, null, 1, 500).meta().limit()).isEqualTo(50);
    }

    @Test
    void filtersByAnyTagOrByAllTags() {
        assertThat(ids(list(List.of("dp", "graphs"), false, null, null, null, 1, 20).items()))
                .containsExactly("4/A", "3/C", "2/A", "1/B");
        assertThat(ids(list(List.of("dp", "math"), true, null, null, null, 1, 20).items())).containsExactly("1/B");
    }

    @Test
    void filtersByRatingRangeDroppingUnratedProblems() {
        var page = list(List.of(), false, 1200, 1300, null, 1, 20);
        assertThat(ids(page.items())).containsExactly("4/A", "2/A");
        assertThat(page.meta().total()).isEqualTo(2);
    }

    @Test
    void searchesTitleAndDescriptionText() {
        assertThat(ids(list(List.of(), false, null, null, "theatre", 1, 20).items())).containsExactly("1/A");
        assertThat(ids(list(List.of("dp"), false, null, null, "grid", 1, 20).items())).containsExactly("1/B");
        assertThat(ids(list(List.of(), false, null, null, "theatre grid", 1, 20).items()))
                .containsExactlyInAnyOrder("1/A", "1/B");
        assertThat(list(List.of(), false, null, null, "the", 1, 20).items()).isEmpty();
    }

    @Test
    void includesCfApiRowsWithDefaults() {
        var row = list(List.of("dp"), false, null, null, null, 1, 20).items().getFirst();
        assertThat(row).isEqualTo(new com.algolearn.problems.dto.ProblemSummary("4/A", 4, "A", "Stub 4/A", 1300,
                List.of("dp"), false, "cf_api", null));
    }
}
