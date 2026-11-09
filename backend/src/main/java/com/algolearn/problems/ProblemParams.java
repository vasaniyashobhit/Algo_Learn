package com.algolearn.problems;

import static com.algolearn.problems.ProblemConstants.DEFAULT_K;
import static com.algolearn.problems.ProblemConstants.DEFAULT_RATING_WINDOW;
import static com.algolearn.problems.ProblemConstants.MAX_K;
import static com.algolearn.problems.ProblemConstants.MAX_RATING_WINDOW;
import static com.algolearn.problems.ProblemConstants.MIN_RATING_WINDOW;

import com.algolearn.common.validation.Issues;
import com.algolearn.common.validation.JsText;
import com.algolearn.common.validation.QueryValues;
import com.algolearn.config.ProblemIds;
import java.util.Optional;
import org.springframework.util.MultiValueMap;

/**
 * Route params {@code :contestId/:index} (legacy problemParamsSchema; a lowercase index is
 * upper-cased) and the similar query {@code k}, {@code ratingWindow}. Params issues come first.
 */
public final class ProblemParams {

    private ProblemParams() {
    }

    /** The problem id {@code <contestId>/<INDEX>}. */
    public static String id(String contestId, String index) {
        var issues = new Issues();
        var id = id(contestId, index, issues);
        issues.throwIfAny();
        return id.orElseThrow();
    }

    /** The id and the similar-search options, validated together. */
    public static SimilarParams similar(String contestId, String index, MultiValueMap<String, String> query) {
        var issues = new Issues();
        var id = id(contestId, index, issues);
        var values = new QueryValues(query, issues);
        var k = values.integer("k", 1, MAX_K, DEFAULT_K);
        var window = values.integer("ratingWindow", MIN_RATING_WINDOW, MAX_RATING_WINDOW, DEFAULT_RATING_WINDOW);
        issues.throwIfAny();
        return new SimilarParams(id.orElseThrow(), k.orElseThrow(), window.orElseThrow());
    }

    static Optional<String> id(String contestId, String index, Issues issues) {
        var validContest = ProblemIds.CONTEST_ID_PATTERN.matcher(contestId).matches();
        if (!validContest) {
            issues.add("params.contestId", "contestId must be a positive integer");
        }
        var upper = JsText.upper(JsText.trim(index));
        var validIndex = ProblemIds.PROBLEM_INDEX_PATTERN.matcher(upper).matches();
        if (!validIndex) {
            issues.add("params.index", "index must be 1-3 letters or digits (e.g. A, B1, F2)");
        }
        return validContest && validIndex ? Optional.of(contestId + "/" + upper) : Optional.empty();
    }

    /** A validated GET .../similar request. */
    public record SimilarParams(String id, int k, int ratingWindow) {
    }
}
