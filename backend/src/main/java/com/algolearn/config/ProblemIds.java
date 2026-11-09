package com.algolearn.config;

import java.util.regex.Pattern;

/** Problem id patterns shared by routes, importers and services. */
public final class ProblemIds {

    private static final String INDEX_SOURCE = "[A-Z0-9]{1,3}";

    /** Problem index: 1-3 chars of A-Z/0-9 (e.g. A, F2, GP1, 01). */
    public static final Pattern PROBLEM_INDEX_PATTERN = Pattern.compile("^" + INDEX_SOURCE + "$");

    /** Contest id in a route param: a positive integer without leading zeros. */
    public static final Pattern CONTEST_ID_PATTERN = Pattern.compile("^[1-9]\\d{0,6}$");

    /** Problem id: {@code <contestId>/<index>} (e.g. 1/A, 1950/F2, 1723/GP1, 921/01). */
    public static final Pattern PROBLEM_ID_PATTERN = Pattern.compile("^\\d+/" + INDEX_SOURCE + "$");

    private ProblemIds() {
    }
}
