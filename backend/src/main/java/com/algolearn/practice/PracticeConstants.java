package com.algolearn.practice;

import java.util.List;

/** Legacy PRACTICE_STATUSES, PRACTICE_ORIGINS and VERIFY_REASONS. */
public final class PracticeConstants {

    public static final List<String> STATUSES = List.of("todo", "solved", "skipped");
    public static final List<String> ORIGINS = List.of("recommendation", "similar", "stuck", "manual");

    /** {@code reason} of a negative "I solved it" check (200, not an error). */
    public static final String NOT_SOLVED_YET = "NOT_SOLVED_YET";
    public static final String STILL_JUDGING = "STILL_JUDGING";

    private PracticeConstants() {
    }
}
