package com.algolearn.problems.similar;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemConstants;
import com.algolearn.problems.similar.FallbackPlan.Attempt;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** Legacy fallbackPlan.test.js. */
class FallbackPlanTest {

    private static List<Strategy> strategies(List<Attempt> attempts) {
        return attempts.stream().map(Attempt::strategy).toList();
    }

    @Test
    void tagsAndRatingPrimaryWidenedNoRatingFilterThenNear() {
        var attempts = FallbackPlan.plan(List.of("dp"), 1500, 300, null);
        assertThat(strategies(attempts)).containsExactly(Strategy.PRIMARY, Strategy.WIDENED_WINDOW,
                Strategy.NO_RATING_FILTER, Strategy.NEAR_USER_RATING);
        assertThat(attempts.get(0)).isEqualTo(new Attempt(Strategy.PRIMARY, true, true, 1500, 300));
        assertThat(attempts.get(1)).isEqualTo(new Attempt(Strategy.WIDENED_WINDOW, true, true, 1500, 600));
        assertThat(attempts.get(2)).isEqualTo(new Attempt(Strategy.NO_RATING_FILTER, true, false, 1500, 300));
        assertThat(attempts.get(3)).isEqualTo(new Attempt(Strategy.NEAR_USER_RATING, false, false, 1500, 300));
    }

    @Test
    void tagsWithoutRatingPrimaryWithoutRatingFilterThenNear() {
        var attempts = FallbackPlan.plan(List.of("dp"), null, 300, null);
        assertThat(strategies(attempts)).containsExactly(Strategy.PRIMARY, Strategy.NEAR_USER_RATING);
        assertThat(attempts.get(0)).isEqualTo(new Attempt(Strategy.PRIMARY, true, false, null, 300));
    }

    @Test
    void untaggedWithRatingBandThenNear() {
        var attempts = FallbackPlan.plan(List.of(), 1400, 300, null);
        assertThat(strategies(attempts)).containsExactly(Strategy.RATING_BAND, Strategy.NEAR_USER_RATING);
        assertThat(attempts.get(0)).isEqualTo(new Attempt(Strategy.RATING_BAND, false, true, 1400,
                ProblemConstants.UNTAGGED_RATING_BAND));
    }

    @Test
    void untaggedAndUnratedOnlyNearTheDefaultTarget() {
        var attempts = FallbackPlan.plan(List.of(), null, null, null);
        assertThat(strategies(attempts)).containsExactly(Strategy.NEAR_USER_RATING);
        assertThat(attempts.get(0).target()).isEqualTo(ProblemConstants.DEFAULT_TARGET_RATING);
        assertThat(attempts.get(0).window()).isEqualTo(ProblemConstants.DEFAULT_RATING_WINDOW);
    }

    @Test
    void theLastAttemptPrefersTheUserRating() {
        assertThat(FallbackPlan.plan(List.of(), 1400, null, 1900).getLast().target()).isEqualTo(1900);
        assertThat(FallbackPlan.plan(List.of("dp"), null, null, 2100).getLast().target()).isEqualTo(2100);
    }

    @Test
    void strategiesSerializeAsLegacyStrings() {
        var json = JsonMapper.builder().build().writeValueAsString(Strategy.values());
        assertThat(json).isEqualTo(
                "[\"primary\",\"widened_window\",\"no_rating_filter\",\"rating_band\",\"near_user_rating\"]");
    }
}
