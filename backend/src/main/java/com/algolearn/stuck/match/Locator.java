package com.algolearn.stuck.match;

import com.algolearn.llm.CoachAnswer;
import com.algolearn.problems.similar.SimilarityMath;
import com.algolearn.stuck.StuckConstants;
import com.algolearn.stuck.StuckRepository;
import java.util.List;
import java.util.Objects;

/** Legacy stuck.locate: finds the problem in our DB, then detects its tags (db → ai → neighbors → none). */
public class Locator {

    private final StuckRepository repo;

    public Locator(StuckRepository repo) {
        this.repo = repo;
    }

    /**
     * By id (Codeforces link), else an exact title/statement match among the text-search neighbors of the text.
     * {@code neighbors} is null when the id matched (searched later only if needed).
     */
    public Located locate(String problemId, String text) {
        if (problemId != null) {
            var byId = repo.findProblem(problemId);
            if (byId.isPresent()) {
                return new Located(byId.get(), null);
            }
        }
        if (text == null || text.isEmpty()) {
            return new Located(null, List.of());
        }
        var neighbors = search(text);
        return new Located(ProblemMatch.findExactMatch(text, neighbors).orElse(null), neighbors);
    }

    /** Rating: stored → AI estimate → the neighbors' median (only when the tags come from neighbors). */
    public Detected detectTags(StuckProblem match, CoachAnswer answer, List<StuckProblem> neighbors, String text) {
        var known = match != null && match.rating() != null ? match.rating()
                : answer == null ? null : answer.estimatedRating();
        var dbTags = SimilarityMath.topicTagsOf(match == null ? List.of() : match.tags());
        if (!dbTags.isEmpty()) {
            return new Detected(dbTags, "db", known);
        }
        if (answer != null && !answer.tags().isEmpty()) {
            return new Detected(answer.tags(), "ai", known);
        }
        var found = neighbors != null ? neighbors : text == null || text.isEmpty() ? List.<StuckProblem>of()
                : search(text);
        var near = found.stream().filter(n -> match == null || !Objects.equals(n.id(), match.id())).toList();
        var tags = Neighbors.tags(near, StuckConstants.MAX_NEIGHBOR_TAGS);
        return new Detected(tags, tags.isEmpty() ? null : "neighbors", known != null ? known : Neighbors.rating(near));
    }

    private List<StuckProblem> search(String text) {
        return repo.searchProblems(ProblemMatch.searchQuery(text), StuckConstants.NEIGHBORS);
    }

    /** The matched problem (or null) and the text-search neighbors (null when not searched). */
    public record Located(StuckProblem match, List<StuckProblem> neighbors) {
    }

    /** Detected tags, where they came from (null when none) and the rating. */
    public record Detected(List<String> tags, String tagsSource, Integer rating) {
    }
}
