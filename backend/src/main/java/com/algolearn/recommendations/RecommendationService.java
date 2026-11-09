package com.algolearn.recommendations;

import static com.algolearn.recommendations.RecommendationConstants.PROBLEMS_PER_TOPIC;
import static com.algolearn.recommendations.RecommendationConstants.round4;

import com.algolearn.problems.ProblemConstants;
import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.problems.similar.SimilarSearch.SimilarRequest;
import com.algolearn.recommendations.calc.PickNextTopics;
import com.algolearn.recommendations.calc.RankByFailed;
import com.algolearn.recommendations.calc.SolvedCopies.ProblemRef;
import com.algolearn.recommendations.calc.TargetRange;
import com.algolearn.recommendations.calc.TopicPick;
import com.algolearn.recommendations.dto.RecommendedProblem;
import com.algolearn.recommendations.dto.RecommendedTopic;
import com.algolearn.recommendations.dto.Recommendations;
import com.algolearn.stats.EmptyReason;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Legacy getRecommendations: next topics and, per topic, up to 5 problems rated in its target range,
 * excluding solved problems (and their Div1/Div2 copies), practice items and problems picked for an
 * earlier topic, ranked by similarity to recent failures. A short pool is filled by the similar
 * search (its order kept), so a topic only gets no problems when nothing else is left.
 */
@Service
public class RecommendationService {

    private final ContextLoader loader;
    private final RecommendationQueries queries;
    private final SimilarSearch similar;

    public RecommendationService(ContextLoader loader, RecommendationQueries queries, SimilarSearch similar) {
        this.loader = loader;
        this.queries = queries;
        this.similar = similar;
    }

    @Transactional(readOnly = true)
    public Recommendations getRecommendations(UUID userId) {
        var ctx = loader.load(userId);
        var picks = PickNextTopics.pick(ctx.stats(), ctx.freq(), RecommendationConstants.TOPICS,
                ctx.userRating() != null);
        var taken = new LinkedHashSet<String>();
        var topics = new ArrayList<RecommendedTopic>();
        for (var pick : picks) {
            var topic = problemsFor(pick, ctx, taken);
            topic.problems().forEach(p -> taken.add(p.id()));
            topics.add(topic);
        }
        var meta = new Recommendations.Meta(ctx.userRating(), ctx.freq().rating(), ctx.stats().isEmpty(),
                ctx.recentFailed().size(), EmptyReason.of(ctx.cfHandle(), ctx.lastSyncedAt()).orElse(null));
        return new Recommendations(new Recommendations.Data(topics), meta);
    }

    private RecommendedTopic problemsFor(TopicPick pick, RecommendationContext ctx, Set<String> taken) {
        var range = TargetRange.of(TargetRange.baseRating(pick.comfortRating(), ctx.userRating()));
        var excluded = new ArrayList<>(ctx.excludeIds());
        excluded.addAll(taken);
        var ranked = fromRange(pick.topic(), range, ctx, excluded);
        var problems = new ArrayList<>(ranked);
        var missing = PROBLEMS_PER_TOPIC - ranked.size();
        if (missing > 0) {
            excluded.addAll(ranked.stream().map(RecommendedProblem::id).toList());
            problems.addAll(fromSimilar(pick.topic(), range, ctx, excluded, missing));
        }
        return RecommendedTopic.of(pick, range, problems);
    }

    private List<RecommendedProblem> fromRange(String topic, TargetRange range, RecommendationContext ctx,
            List<String> excluded) {
        var fresh = queries.inRange(topic, range, excluded).stream().filter(p -> !solved(ctx, p)).toList();
        return RankByFailed.rank(fresh, ctx.recentFailed()).stream().limit(PROBLEMS_PER_TOPIC)
                .map(r -> RecommendedProblem.of(r.problem(), r.similarityToFailed(),
                        RecommendationConstants.PICKED_TARGET_RANGE))
                .toList();
    }

    private List<RecommendedProblem> fromSimilar(String topic, TargetRange range, RecommendationContext ctx,
            List<String> excluded, int missing) {
        var k = Math.min(ProblemConstants.MAX_K, missing + RecommendationConstants.COPY_SLACK);
        var request = new SimilarRequest(List.of(topic), (range.min() + range.max()) / 2, ctx.userRating(), excluded,
                ctx.solvedTitles(), k, (range.max() - range.min()) / 2);
        return similar.find(request).items().stream().filter(p -> !solved(ctx, p)).limit(missing)
                .map(p -> RecommendedProblem.of(p, round4(RankByFailed.maxJaccard(p.tags(), ctx.recentFailed())),
                        RecommendationConstants.PICKED_SIMILAR))
                .toList();
    }

    private static boolean solved(RecommendationContext ctx, ProblemSummary p) {
        return ctx.isSolved().test(new ProblemRef(p.id(), p.title(), p.contestId()));
    }
}
