package com.algolearn.practice;

import com.algolearn.common.validation.Issues;
import com.algolearn.common.validation.JsText;
import com.algolearn.common.validation.JsonBody;
import com.algolearn.config.ProblemIds;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;

/** Single-field rules of the practice schemas (zod messages). */
final class PracticeFields {

    static final String BAD_ID = "problemId must look like \"<contestId>/<index>\", e.g. 1/A";

    private PracticeFields() {
    }

    static Optional<String> problemId(JsonNode value, Issues issues) {
        if (value == null || !value.isString()) {
            issues.add("body.problemId", "Invalid input: expected string, received " + JsonBody.typeOf(value));
            return Optional.empty();
        }
        var id = JsText.upper(JsText.trim(value.stringValue()));
        if (!ProblemIds.PROBLEM_ID_PATTERN.matcher(id).matches()) {
            issues.add("body.problemId", BAD_ID);
            return Optional.empty();
        }
        return Optional.of(id);
    }

    static Optional<String> option(JsonNode value, List<String> options, String field, Issues issues) {
        if (value != null && value.isString() && options.contains(value.stringValue())) {
            return Optional.of(value.stringValue());
        }
        issues.add(field, invalidOption(options));
        return Optional.empty();
    }

    static String invalidOption(List<String> options) {
        return "Invalid option: expected one of " + options.stream().map(o -> "\"" + o + "\"")
                .collect(Collectors.joining("|"));
    }
}
