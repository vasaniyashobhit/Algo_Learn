package com.algolearn.stats.calc;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.stats.calc.Activity.Day;
import com.algolearn.stats.calc.RatingBands.Band;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/** Legacy ratingBands.test.js and activity.test.js. */
class RatingBandsActivityTest {

    static final Instant NOW = Instant.parse("2026-10-29T10:00:00Z");

    static ProblemAttempt solved(boolean solved, Integer rating) {
        return new ProblemAttempt("1/A", rating, List.of(), solved, 1, NOW);
    }

    static Map<Integer, Integer> counts(RatingBands.SolvedByRating result) {
        return result.bands().stream().collect(Collectors.toMap(Band::from, Band::solved));
    }

    static SubmissionRow at(String instant, String verdict) {
        return new SubmissionRow("1/A", null, List.of(), verdict, Instant.parse(instant));
    }

    @Test
    void listsEvery200WideBandFrom800To3400WithZeros() {
        var result = RatingBands.solvedByRating(List.of());
        assertThat(result.bands()).hasSize(14);
        assertThat(result.bands().getFirst()).isEqualTo(new Band(800, 999, 0));
        assertThat(result.bands().getLast()).isEqualTo(new Band(3400, 3599, 0));
        assertThat(result.unrated()).isZero();
    }

    @Test
    void countsSolvedProblemsOnlyByBand() {
        var result = RatingBands.solvedByRating(List.of(solved(true, 1200), solved(true, 1399), solved(true, 1400),
                solved(false, 1200), solved(true, null), solved(true, null)));
        assertThat(counts(result)).containsEntry(1200, 2).containsEntry(1400, 1).containsEntry(800, 0);
        assertThat(result.unrated()).isEqualTo(2);
    }

    @Test
    void clampsRatingsOutsideTheRange() {
        var result = RatingBands.solvedByRating(List.of(solved(true, 500), solved(true, 3800)));
        assertThat(counts(result)).containsEntry(800, 1).containsEntry(3400, 1);
    }

    @Test
    void utcDayFormatsTheUtcCalendarDay() {
        assertThat(Activity.utcDay(Instant.parse("2026-10-29T23:59:59Z"))).isEqualTo("2026-10-29");
        assertThat(Activity.utcDay(Instant.parse("2026-01-02T00:00:00Z"))).isEqualTo("2026-01-02");
    }

    @Test
    void listsTheLast30DaysOldestFirstZeroFilled() {
        var days = Activity.daily(List.of(), NOW, 30);
        assertThat(days).hasSize(30);
        assertThat(days.getFirst()).isEqualTo(new Day("2026-09-30", 0, 0));
        assertThat(days.getLast()).isEqualTo(new Day("2026-10-29", 0, 0));
    }

    @Test
    void countsSubmissionsAndAcceptedPerDayIgnoringOlderOnes() {
        var days = Activity.daily(List.of(at("2026-10-29T01:00:00Z", "OK"), at("2026-10-29T02:00:00Z", "WRONG_ANSWER"),
                at("2026-10-01T05:00:00Z", "OK"), at("2026-09-29T23:00:00Z", "OK")), NOW, 30);
        assertThat(days.getLast()).isEqualTo(new Day("2026-10-29", 2, 1));
        assertThat(days).contains(new Day("2026-10-01", 1, 1));
        assertThat(days.stream().mapToInt(Day::submissions).sum()).isEqualTo(3);
    }

    @Test
    void acceptsAnotherWindow() {
        assertThat(Activity.daily(List.of(), NOW, 7).stream().map(Day::date)).containsExactly("2026-10-23",
                "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29");
    }
}
