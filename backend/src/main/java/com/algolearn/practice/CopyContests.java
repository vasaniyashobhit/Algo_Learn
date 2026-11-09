package com.algolearn.practice;

import com.algolearn.recommendations.RecommendationConstants;
import java.util.List;
import java.util.stream.IntStream;

/** Legacy copyFilter.js: the contests a Div1/Div2 copy of a problem in {@code contestId} can live in. */
public final class CopyContests {

    private CopyContests() {
    }

    /** {@code contestId − gap … contestId + gap}, skipping ids below 1. */
    public static List<Integer> around(int contestId, int gap) {
        return IntStream.rangeClosed(contestId - gap, contestId + gap).filter(id -> id >= 1).boxed().toList();
    }

    public static List<Integer> around(int contestId) {
        return around(contestId, RecommendationConstants.COPY_CONTEST_GAP);
    }
}
