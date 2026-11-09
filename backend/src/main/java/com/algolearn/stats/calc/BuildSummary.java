package com.algolearn.stats.calc;

import static com.algolearn.stats.StatsConstants.ACTIVITY_DAYS;
import static com.algolearn.stats.StatsConstants.MIN_WEAK_ATTEMPTS;
import static com.algolearn.stats.StatsConstants.TOP_N;

import com.algolearn.stats.dto.Summary;
import com.algolearn.stats.dto.TopicStatView;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

/**
 * Dashboard summary from a user's submissions and topic stats (legacy buildSummary). Always the
 * same shape: with no data every count is 0, lists are empty, bands and days are zero-filled.
 * Weakest topics need ≥ 3 attempted problems, so one unlucky try is not "weak".
 */
public final class BuildSummary {

    /**
     * Ties: more attempts first, then the key. Single topic keys hold only lower-case letters, digits,
     * spaces and '-', where String order equals the legacy localeCompare order.
     */
    static final Comparator<TopicStatView> STRONGEST = Comparator.comparingDouble(TopicStatView::strength)
            .reversed().thenComparing(Comparator.comparingInt(TopicStatView::attempted).reversed())
            .thenComparing(TopicStatView::topicKey);
    static final Comparator<TopicStatView> WEAKEST = Comparator.comparingDouble(TopicStatView::strength)
            .thenComparing(Comparator.comparingInt(TopicStatView::attempted).reversed())
            .thenComparing(TopicStatView::topicKey);

    private BuildSummary() {
    }

    public static Summary build(List<SubmissionRow> submissions, List<TopicStatDoc> stats, Instant now) {
        var problems = GroupByProblem.group(submissions);
        var singles = stats.stream().filter(s -> "single".equals(s.kind())).map(TopicStatView::of).toList();
        var totals = new Summary.Totals(submissions.size(), problems.size(),
                (int) problems.stream().filter(ProblemAttempt::solved).count(), singles.size(),
                stats.size() - singles.size());
        var strongest = singles.stream().sorted(STRONGEST).limit(TOP_N).toList();
        var weakest = singles.stream().filter(s -> s.attempted() >= MIN_WEAK_ATTEMPTS).sorted(WEAKEST)
                .limit(TOP_N).toList();
        return new Summary(totals, strongest, weakest, RatingBands.solvedByRating(problems),
                Activity.daily(submissions, now, ACTIVITY_DAYS));
    }
}
