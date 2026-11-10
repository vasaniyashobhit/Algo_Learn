package com.algolearn.stuck.result;

import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.problems.similar.SimilarSearch.SimilarRequest;
import com.algolearn.stuck.StuckConstants;
import com.algolearn.stuck.StuckRepository.UserContext;
import com.algolearn.stuck.gap.Gap;
import com.algolearn.stuck.match.StuckProblem;
import java.util.List;
import java.util.stream.Stream;

/**
 * Legacy similarFor: similar problems with the rating window centred {@link StuckConstants#EASIER_BY} below the
 * problem's rating (or the user's rating if unknown) when the gap has a weak/unseen single topic. The problem itself
 * and everything the user solved are excluded.
 */
public class EasierSimilar {

    private final SimilarSearch search;

    public EasierSimilar(SimilarSearch search) {
        this.search = search;
    }

    public SimilarBlock find(List<String> tags, Integer rating, Gap gap, StuckProblem match, UserContext context) {
        var easier = gap.items().stream().anyMatch(item -> "single".equals(item.kind()));
        var base = rating != null ? rating : context.userRating();
        var target = base == null ? null : base - (easier ? StuckConstants.EASIER_BY : 0);
        var exclude = Stream.concat(match == null ? Stream.<String>empty() : Stream.of(match.id()),
                context.solvedIds().stream()).toList();
        var titles = match == null || match.title() == null ? List.<String>of() : List.of(match.title());
        var found = search.find(new SimilarRequest(tags, target, context.userRating(), exclude, titles,
                StuckConstants.SIMILAR_K, null));
        return new SimilarBlock(found.items(), easier, found.meta().targetRating(), found.meta().strategies());
    }
}
