package com.algolearn.stats.calc;

import static com.algolearn.stats.StatsConstants.DAY_MS;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;

/** Submissions per UTC day (legacy activity.js). */
public final class Activity {

    private Activity() {
    }

    /** UTC calendar day of an instant, as {@code YYYY-MM-DD}. */
    public static String utcDay(Instant instant) {
        return instant.atOffset(ZoneOffset.UTC).toLocalDate().toString();
    }

    /**
     * Submissions and accepted submissions per UTC day for the last {@code days} days, oldest first,
     * ending today. Days without activity are listed with zeros.
     */
    public static List<Day> daily(List<SubmissionRow> submissions, Instant now, int days) {
        var byDay = new LinkedHashMap<String, int[]>();
        for (var i = 0; i < days; i++) {
            byDay.put(utcDay(now.minusMillis((days - 1 - i) * DAY_MS)), new int[2]);
        }
        for (var submission : submissions) {
            var day = byDay.get(utcDay(submission.submittedAt()));
            if (day == null) {
                continue;
            }
            day[0] += 1;
            if (GroupByProblem.ACCEPTED.equals(submission.verdict())) {
                day[1] += 1;
            }
        }
        return byDay.entrySet().stream().map(e -> new Day(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();
    }

    /** One UTC day of activity. */
    public record Day(String date, int submissions, int accepted) {
    }
}
