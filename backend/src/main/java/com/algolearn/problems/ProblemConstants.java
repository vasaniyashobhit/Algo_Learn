package com.algolearn.problems;

/** Legacy SIMILARITY and PROBLEM_LIST constants (config/constants.js). */
public final class ProblemConstants {

    public static final double JACCARD_WEIGHT = 0.75;
    public static final double RATING_WEIGHT = 0.25;
    public static final int DEFAULT_K = 10;
    public static final int MAX_K = 30;
    public static final int DEFAULT_RATING_WINDOW = 300;
    public static final int MIN_RATING_WINDOW = 50;
    public static final int MAX_RATING_WINDOW = 1000;
    public static final int WIDEN_FACTOR = 2;
    public static final int UNTAGGED_RATING_BAND = 200;
    public static final int DEFAULT_TARGET_RATING = 1200;

    public static final int DEFAULT_LIMIT = 20;
    public static final int MAX_LIMIT = 50;
    public static final int MAX_TAGS = 10;
    public static final int MAX_QUERY_LENGTH = 100;
    public static final int MAX_PAGE = 10_000;
    public static final int MAX_RATING = 4000;

    private ProblemConstants() {
    }
}
