package com.algolearn.stuck.match;

import java.util.List;

/** A stored problem with what the stuck flow needs: the statement for the coach, the editorial for the fallback. */
public record StuckProblem(String id, String title, String description, String inputFormat, String outputFormat,
        String note, String editorial, Integer rating, List<String> tags) {

    public StuckProblem {
        tags = tags == null ? List.of() : List.copyOf(tags);
    }
}
