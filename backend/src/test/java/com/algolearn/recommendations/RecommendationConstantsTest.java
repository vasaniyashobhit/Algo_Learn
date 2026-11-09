package com.algolearn.recommendations;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.practice.PracticeConstants;
import com.algolearn.sync.SyncSettings;
import java.time.Duration;
import org.junit.jupiter.api.Test;

/** Legacy recommendationConstants.test.js. */
class RecommendationConstantsTest {

    @Test
    void matchTheF10Spec() {
        assertThat(new int[] {RecommendationConstants.TOPICS, RecommendationConstants.PROBLEMS_PER_TOPIC,
            RecommendationConstants.MIN_ATTEMPTED, RecommendationConstants.FREQUENCY_WINDOW,
            RecommendationConstants.DEFAULT_RATING, RecommendationConstants.TARGET_LOW,
            RecommendationConstants.TARGET_HIGH, RecommendationConstants.TARGET_ROUNDING,
            RecommendationConstants.RECENT_FAILED, RecommendationConstants.COPY_CONTEST_GAP})
                .containsExactly(3, 5, 3, 300, 1200, 100, 300, 100, 10, 2);
        assertThat(RecommendationConstants.MIN_STRENGTH).isEqualTo(0.2);
        assertThat(RecommendationConstants.MAX_STRENGTH).isEqualTo(0.75);
        assertThat(RecommendationConstants.FREQUENCY_CACHE).isEqualTo(Duration.ofMillis(3_600_000));
    }

    @Test
    void exposeTheResponseEnums() {
        assertThat(RecommendationConstants.BASIS_LEARNING_ZONE).isEqualTo("learning_zone");
        assertThat(RecommendationConstants.BASIS_FREQUENT).isEqualTo("frequent");
        assertThat(RecommendationConstants.PICKED_TARGET_RANGE).isEqualTo("target_range");
        assertThat(RecommendationConstants.PICKED_SIMILAR).isEqualTo("similar_fallback");
        assertThat(PracticeConstants.NOT_SOLVED_YET).isEqualTo("NOT_SOLVED_YET");
        assertThat(PracticeConstants.STILL_JUDGING).isEqualTo("STILL_JUDGING");
        assertThat(PracticeConstants.STATUSES).containsExactly("todo", "solved", "skipped");
        assertThat(PracticeConstants.ORIGINS).containsExactly("recommendation", "similar", "stuck", "manual");
    }

    @Test
    void setsThe20SecondSyncCooldown() {
        assertThat(SyncSettings.DEFAULT.cooldownMs()).isEqualTo(20_000);
    }

    @Test
    void round4MatchesJavaScript() {
        assertThat(RecommendationConstants.round4(2 / 3.0)).isEqualTo(0.6667);
        assertThat(RecommendationConstants.round4(0.5)).isEqualTo(0.5);
    }
}
