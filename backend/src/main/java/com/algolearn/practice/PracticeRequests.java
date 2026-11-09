package com.algolearn.practice;

import com.algolearn.common.validation.Issues;
import com.algolearn.common.validation.JsonBody;
import com.algolearn.common.validation.QueryValues;
import com.algolearn.common.validation.StrictKeys;
import com.algolearn.problems.ProblemParams;
import java.util.Optional;
import java.util.Set;
import org.springframework.util.MultiValueMap;

/** Legacy practice.schema.js: list query, add body and update body (strict objects, zod messages). */
public final class PracticeRequests {

    private PracticeRequests() {
    }

    /** GET {@code ?status=}: optional, blank = absent; null when not filtered. */
    public static String parseStatus(MultiValueMap<String, String> query) {
        var issues = new Issues();
        var status = status(query, issues);
        issues.throwIfAny();
        return status;
    }

    public static AddPractice parseAdd(JsonBody body) {
        var issues = new Issues();
        var request = add(body, issues);
        issues.throwIfAny();
        return request;
    }

    /** PATCH: params issues first, then the body. */
    public static UpdatePractice parseUpdate(String contestId, String index, JsonBody body) {
        var issues = new Issues();
        var id = ProblemParams.id(contestId, index, issues);
        var status = update(body, issues);
        issues.throwIfAny();
        return new UpdatePractice(id.orElseThrow(), status);
    }

    static String status(MultiValueMap<String, String> query, Issues issues) {
        var raw = new QueryValues(query, issues).all("status");
        if (raw.isEmpty() || raw.size() == 1 && raw.getFirst().isEmpty()) {
            return null;
        }
        if (raw.size() == 1 && PracticeConstants.STATUSES.contains(raw.getFirst())) {
            return raw.getFirst();
        }
        issues.add("query.status", PracticeFields.invalidOption(PracticeConstants.STATUSES));
        return null;
    }

    /** POST body {@code { problemId, addedFrom = "manual" }}; the id is trimmed and upper-cased. */
    static AddPractice add(JsonBody body, Issues issues) {
        var object = body.object(issues);
        var id = object.flatMap(o -> PracticeFields.problemId(o.get("problemId"), issues));
        var from = object.flatMap(o -> o.get("addedFrom") == null ? Optional.of("manual")
                : PracticeFields.option(o.get("addedFrom"), PracticeConstants.ORIGINS, "body.addedFrom", issues));
        object.ifPresent(o -> StrictKeys.check(o, Set.of("problemId", "addedFrom"), "body", issues));
        return id.isPresent() && from.isPresent() ? new AddPractice(id.get(), from.get()) : null;
    }

    /** PATCH body {@code { status }}. Returns null when invalid (issues added). */
    static String update(JsonBody body, Issues issues) {
        var object = body.object(issues);
        var status = object.flatMap(o -> PracticeFields.option(o.get("status"), PracticeConstants.STATUSES,
                "body.status", issues));
        object.ifPresent(o -> StrictKeys.check(o, Set.of("status"), "body", issues));
        return status.orElse(null);
    }

    /** A validated POST /practice body. */
    public record AddPractice(String problemId, String addedFrom) {
    }

    /** A validated PATCH request: the problem id and the new status. */
    public record UpdatePractice(String problemId, String status) {
    }
}
