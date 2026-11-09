package com.algolearn.stats.calc;

import static com.algolearn.stats.StatsConstants.DAY_MS;
import static com.algolearn.stats.StatsConstants.DIFFICULTY_SCALE;
import static com.algolearn.stats.StatsConstants.FAIL_BASE;
import static com.algolearn.stats.StatsConstants.HALF_LIFE_DAYS;
import static com.algolearn.stats.StatsConstants.NEUTRAL_WEIGHT;
import static com.algolearn.stats.StatsConstants.PRIOR;
import static com.algolearn.stats.StatsConstants.PRIOR_MEAN;
import static com.algolearn.stats.StatsConstants.SOLVED_BASE;

import java.time.Instant;

/** Pure formula helpers (legacy lib/sigmoid, decay, difficultyWeight, contribution, strength). */
public final class StrengthMath {

    private StrengthMath() {
    }

    /** Logistic function 1 / (1 + e^−x): in (0, 1), 0.5 at x = 0. */
    public static double sigmoid(double x) {
        return 1 / (1 + Math.exp(-x));
    }

    /** Age in (fractional) days; 0 when {@code lastAt} is in the future (clock skew). */
    public static double ageDays(Instant lastAt, Instant now) {
        return Math.max(0, (double) (now.toEpochMilli() - lastAt.toEpochMilli()) / DAY_MS);
    }

    /** 0.5^(ageDays / halfLife): 1 today, 0.5 after 90 days, 0.25 after 180. */
    public static double decay(Instant lastAt, Instant now, double halfLifeDays) {
        return Math.pow(0.5, ageDays(lastAt, now) / halfLifeDays);
    }

    public static double decay(Instant lastAt, Instant now) {
        return decay(lastAt, now, HALF_LIFE_DAYS);
    }

    /** sigmoid((problemRating − userRating) / scale); 0.5 when either rating is unknown. */
    public static double difficultyWeight(Integer problemRating, Integer userRating, double scale) {
        return problemRating != null && userRating != null
                ? sigmoid((problemRating - userRating) / scale)
                : NEUTRAL_WEIGHT;
    }

    public static double difficultyWeight(Integer problemRating, Integer userRating) {
        return difficultyWeight(problemRating, userRating, DIFFICULTY_SCALE);
    }

    /**
     * What one problem adds to each of its topics. Solved → d·(0.5 + w) (harder solves count more);
     * unsolved → d·(1.5 − w) (failing an easy problem hurts more).
     */
    public static Contribution contribution(ProblemAttempt problem, Integer userRating, Instant now) {
        var d = decay(problem.lastAt(), now);
        var w = difficultyWeight(problem.rating(), userRating);
        return problem.solved()
                ? new Contribution(d * (SOLVED_BASE + w), 0)
                : new Contribution(0, d * (FAIL_BASE - w));
    }

    /** Smoothed strength in (0, 1): {@code prior} virtual attempts at {@code priorMean}. */
    public static double strength(double solvedScore, double failScore, double prior, double priorMean) {
        return (solvedScore + prior * priorMean) / (solvedScore + failScore + prior);
    }

    public static double strength(double solvedScore, double failScore) {
        return strength(solvedScore, failScore, PRIOR, PRIOR_MEAN);
    }

    /** The scores one problem adds to a topic. */
    public record Contribution(double solvedScore, double failScore) {
    }
}
