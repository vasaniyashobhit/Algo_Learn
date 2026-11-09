package com.algolearn.stats.calc;

import java.time.Instant;
import java.util.List;

/** One problem a user attempted (legacy groupByProblem entry). {@code solved} = any OK verdict. */
public record ProblemAttempt(String problemId, Integer rating, List<String> tags, boolean solved, int attempts,
        Instant lastAt) {

    public ProblemAttempt {
        tags = List.copyOf(tags);
    }
}
