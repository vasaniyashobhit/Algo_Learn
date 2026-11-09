package com.algolearn.stats.dto;

import com.algolearn.stats.calc.Activity;
import com.algolearn.stats.calc.RatingBands;
import java.util.List;

/** GET /users/me/stats/summary data (same key order as legacy buildSummary). */
public record Summary(Totals totals, List<TopicStatView> strongest, List<TopicStatView> weakest,
        RatingBands.SolvedByRating solvedByRating, List<Activity.Day> activity) {

    public Summary {
        strongest = List.copyOf(strongest);
        weakest = List.copyOf(weakest);
        activity = List.copyOf(activity);
    }

    /** Counts for the dashboard header. */
    public record Totals(int submissions, int problemsAttempted, int problemsSolved, int topicsAttempted,
            int pairsTracked) {
    }
}
