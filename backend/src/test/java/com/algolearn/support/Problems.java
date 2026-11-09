package com.algolearn.support;

import com.algolearn.problems.Problem;
import java.util.List;

/** Problem fixtures (legacy makeProblem / problemAt / insertCfApiStub). */
public final class Problems {

    private Problems() {
    }

    /** An "hf" problem with a statement, title "Title <id>", rating 1200 and tags dp, greedy. */
    public static Problem at(String id) {
        return at(id, 1200, "dp", "greedy");
    }

    /** An "hf" problem with the given rating (null = unrated) and tags. */
    public static Problem at(String id, Integer rating, String... tags) {
        var parts = id.split("/");
        var problem = new Problem();
        problem.setId(id);
        problem.setContestId(Integer.parseInt(parts[0]));
        problem.setIndex(parts[1]);
        problem.setTitle("Title " + id);
        problem.setDescription("Given an array of n integers, find the maximum sum.");
        problem.setRating(rating);
        problem.setTags(List.of(tags));
        problem.setTagCount(tags.length);
        problem.setSource("hf");
        return problem;
    }

    public static Problem titled(String title, Problem problem) {
        problem.setTitle(title);
        return problem;
    }

    /** A cf_api row like the problemset sync writes: title "Stub <id>", no statement text. */
    public static Problem stub(String id, Integer rating, String... tags) {
        var problem = at(id, rating, tags);
        problem.setTitle("Stub " + id);
        problem.setDescription("");
        problem.setSource("cf_api");
        return problem;
    }
}
