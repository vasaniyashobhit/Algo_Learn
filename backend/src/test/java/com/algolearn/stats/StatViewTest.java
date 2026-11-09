package com.algolearn.stats;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.stats.calc.TopicStatDoc;
import com.algolearn.stats.dto.TopicStatView;
import com.algolearn.support.Json;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy statView.test.js (toTopicStatView, emptyReason / withReason) and statsConstants.test.js. */
class StatViewTest {

    @Test
    void listsTheTagsOfAPairAndKeepsThePublicFieldsInLegacyOrder() {
        var at = Instant.parse("2026-10-01T00:00:00Z");
        var view = TopicStatView.of(new TopicStatDoc("bitmasks+dp", "pair", 4, 3, 1, 1500, 1700, 1600, 0.7, at,
                List.of(new LastResult("1/A", true))));
        var json = Json.parse(Json.MAPPER.writeValueAsString(view));
        assertThat(json.propertyNames()).containsExactly("topicKey", "kind", "tags", "attempted", "solved", "failed",
                "strength", "comfortRating", "avgSolvedRating", "maxSolvedRating", "lastActivityAt", "lastResults");
        assertThat(view.tags()).containsExactly("bitmasks", "dp");
        assertThat(json.get("lastActivityAt").asString()).isEqualTo("2026-10-01T00:00:00.000Z");
        assertThat(json.get("lastResults").toString()).isEqualTo("[{\"problemId\":\"1/A\",\"solved\":true}]");
        assertThat(json.get("comfortRating").asInt()).isEqualTo(1600);
    }

    @Test
    void writesNullsForMissingRatingsAndActivity() {
        var view = TopicStatView.of(new TopicStatDoc("dp", "single", 0, 0, 0, null, null, null, 0, null, List.of()));
        var json = Json.parse(Json.MAPPER.writeValueAsString(view));
        assertThat(json.get("comfortRating").isNull()).isTrue();
        assertThat(json.get("avgSolvedRating").isNull()).isTrue();
        assertThat(json.get("maxSolvedRating").isNull()).isTrue();
        assertThat(json.get("lastActivityAt").isNull()).isTrue();
        assertThat(view.tags()).containsExactly("dp");
        assertThat(view.lastResults()).isEmpty();
    }

    @Test
    void emptyReasonIsNoHandleNotSyncedOrNothing() {
        assertThat(EmptyReason.of(null, null)).contains("NO_HANDLE");
        assertThat(EmptyReason.of("", null)).contains("NO_HANDLE");
        assertThat(EmptyReason.of("tourist", null)).contains("NOT_SYNCED");
        assertThat(EmptyReason.of("tourist", Instant.now())).isEmpty();
    }

    @Test
    void constantsMatchTheAgreedFormulaSettings() {
        assertThat(List.of(StatsConstants.HALF_LIFE_DAYS, StatsConstants.DIFFICULTY_SCALE, StatsConstants.PRIOR,
                StatsConstants.PRIOR_MEAN)).containsExactly(90.0, 300.0, 3.0, 0.5);
        assertThat(List.of(StatsConstants.MIN_PAIR_ATTEMPTS, StatsConstants.COMFORT_WINDOW_DAYS,
                StatsConstants.COMFORT_TOP_N, StatsConstants.COMFORT_MIN_SOLVES, StatsConstants.LAST_RESULTS))
                .containsExactly(2, 365, 5, 3, 5);
        assertThat(List.of(StatsConstants.TOP_N, StatsConstants.MIN_WEAK_ATTEMPTS, StatsConstants.ACTIVITY_DAYS,
                StatsConstants.MAX_LIMIT, StatsConstants.DEFAULT_LIMIT)).containsExactly(5, 3, 30, 630, 50);
        assertThat(List.of(StatsConstants.REASON_NO_HANDLE, StatsConstants.REASON_NOT_SYNCED))
                .containsExactly("NO_HANDLE", "NOT_SYNCED");
    }
}
