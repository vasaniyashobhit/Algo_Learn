package com.algolearn.problems.dto;

import com.algolearn.common.validation.JsText;
import com.algolearn.problems.Problem;
import java.util.List;
import java.util.Objects;

/**
 * The full problem: summary fields, every text field ({@code ""} when missing) and
 * {@code hasStatement} (false when the description is blank, e.g. every cf_api row).
 */
public record ProblemDetail(
        String id,
        int contestId,
        String index,
        String title,
        Integer rating,
        List<String> tags,
        boolean hasEditorial,
        String source,
        String description,
        String inputFormat,
        String outputFormat,
        String note,
        String editorial,
        boolean hasStatement) {

    public ProblemDetail {
        tags = List.copyOf(tags);
    }

    public static ProblemDetail of(Problem p) {
        var description = text(p.getDescription());
        return new ProblemDetail(p.getId(), p.getContestId(), p.getIndex(), p.getTitle(), p.getRating(),
                p.getTags() == null ? List.of() : p.getTags(), p.isHasEditorial(),
                Objects.requireNonNullElse(p.getSource(), "hf"), description, text(p.getInputFormat()),
                text(p.getOutputFormat()), text(p.getNote()), text(p.getEditorial()), !JsText.isBlank(description));
    }

    private static String text(String value) {
        return value == null ? "" : value;
    }
}
