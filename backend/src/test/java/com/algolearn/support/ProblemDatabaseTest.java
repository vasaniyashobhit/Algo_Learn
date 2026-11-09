package com.algolearn.support;

import com.algolearn.problems.Problem;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.problems.similar.SimilarSearch.SimilarRequest;
import com.algolearn.problems.similar.SimilarSearch.SimilarResult;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** A database test that seeds problems and runs the similar search (legacy seedProblems / findSimilar). */
public abstract class ProblemDatabaseTest extends DatabaseTest {

    protected final ProblemRepository problems;
    protected final SimilarSearch search;

    protected ProblemDatabaseTest(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search) {
        super(mvc, jdbc);
        this.problems = problems;
        this.search = search;
    }

    protected void seed(Problem... rows) {
        problems.saveAllAndFlush(List.of(rows));
    }

    protected static List<String> ids(List<ProblemSummary> items) {
        return items.stream().map(ProblemSummary::id).toList();
    }

    protected SimilarResult find(List<String> tags, Integer rating, int k) {
        return search.find(new SimilarRequest(tags, rating, null, List.of(), List.of(), k, null));
    }

    protected SimilarResult find(SimilarRequest request) {
        return search.find(request);
    }
}
