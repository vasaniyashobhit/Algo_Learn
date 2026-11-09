package com.algolearn.problems.similar;

import com.algolearn.problems.ProblemConstants;
import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.problems.similar.FallbackPlan.Attempt;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Never-blank similar search (legacy findSimilar): runs the planned attempts in order, each later
 * attempt filling only the slots still free (excluding what was found) until {@code k} are found.
 * {@code meta.strategy} is the first attempt that returned anything; {@code strategies} lists all.
 */
@Service
public class SimilarSearch {

    private final SimilarityQueries queries;

    public SimilarSearch(SimilarityQueries queries) {
        this.queries = queries;
    }

    @Transactional(readOnly = true)
    public SimilarResult find(SimilarRequest request) {
        var topicTags = SimilarityMath.topicTagsOf(request.tags());
        var limit = Math.min(request.k(), ProblemConstants.MAX_K);
        var attempts = FallbackPlan.plan(topicTags, request.rating(), request.ratingWindow(), request.userRating());
        var items = new ArrayList<ProblemSummary>();
        var used = new ArrayList<Attempt>();
        for (var attempt : attempts) {
            if (items.size() >= limit) {
                break;
            }
            var excluded = Stream.concat(request.excludeIds().stream(), items.stream().map(ProblemSummary::id))
                    .toList();
            var found = queries.find(attempt, topicTags, limit - items.size(), excluded, request.excludeTitles());
            if (!found.isEmpty()) {
                used.add(attempt);
            }
            items.addAll(found);
        }
        var main = used.isEmpty() ? attempts.getLast() : used.getFirst();
        var meta = new SimilarMeta(main.strategy(), used.stream().map(Attempt::strategy).toList(), main.window(),
                main.target(), items.size(), null);
        return new SimilarResult(List.copyOf(items), meta);
    }

    /** What to be similar to. {@code ratingWindow} null = default 300; {@code k} is capped at 30. */
    public record SimilarRequest(List<String> tags, Integer rating, Integer userRating, List<String> excludeIds,
            List<String> excludeTitles, int k, Integer ratingWindow) {

        public SimilarRequest {
            tags = tags == null ? List.of() : tags.stream().filter(Objects::nonNull).toList();
            excludeIds = excludeIds == null ? List.of() : List.copyOf(excludeIds);
            excludeTitles = excludeTitles == null ? List.of() : List.copyOf(excludeTitles);
        }

        public static SimilarRequest of(List<String> tags, Integer rating) {
            return new SimilarRequest(tags, rating, null, List.of(), List.of(), ProblemConstants.DEFAULT_K, null);
        }
    }

    /** Items plus meta. */
    public record SimilarResult(List<ProblemSummary> items, SimilarMeta meta) {
    }
}
