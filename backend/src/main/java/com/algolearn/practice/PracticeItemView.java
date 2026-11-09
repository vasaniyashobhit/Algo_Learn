package com.algolearn.practice;

import com.algolearn.common.web.IsoTime;
import com.algolearn.problems.dto.ProblemSummary;

/** The full practice item the client reconciles its optimistic state with ({@code problem} null if gone). */
public record PracticeItemView(String id, String problemId, String status, String addedFrom, String createdAt,
        String updatedAt, ProblemSummary problem) {

    public static PracticeItemView of(PracticeRow row, ProblemSummary problem) {
        return new PracticeItemView(row.id().toString(), row.problemId(), row.status(), row.addedFrom(),
                IsoTime.format(row.createdAt()), IsoTime.format(row.updatedAt()), problem);
    }
}
