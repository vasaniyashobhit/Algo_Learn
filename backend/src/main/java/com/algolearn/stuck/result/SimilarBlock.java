package com.algolearn.stuck.result;

import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.problems.similar.Strategy;
import java.util.List;

/** {@code result.similar}: easier problems on the same topics, whether the window was shifted down, the search meta. */
public record SimilarBlock(List<ProblemSummary> items, boolean easier, Integer targetRating,
        List<Strategy> strategies) {

    public SimilarBlock {
        items = List.copyOf(items);
        strategies = List.copyOf(strategies);
    }
}
