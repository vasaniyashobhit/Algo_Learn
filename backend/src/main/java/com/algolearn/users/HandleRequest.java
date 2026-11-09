package com.algolearn.users;

import com.algolearn.common.validation.Issues;
import com.algolearn.common.validation.JsText;
import com.algolearn.common.validation.JsonBody;
import java.util.ArrayList;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import tools.jackson.databind.node.ObjectNode;

/** PUT /users/me/handle body (legacy strict linkHandleSchema): a trimmed Codeforces handle only. */
public record HandleRequest(String handle) {

    /** Legacy CF_HANDLE_PATTERN. */
    public static final Pattern CF_HANDLE = Pattern.compile("^[A-Za-z0-9_.-]{3,24}$");

    public static HandleRequest parse(JsonBody body) {
        var issues = new Issues();
        var object = body.object(issues);
        var handle = object.flatMap(o -> handle(o, issues));
        object.ifPresent(o -> unknownKeys(o, issues));
        issues.throwIfAny();
        return new HandleRequest(handle.orElseThrow());
    }

    private static Optional<String> handle(ObjectNode body, Issues issues) {
        var value = body.get("handle");
        if (value == null || !value.isString()) {
            issues.add("body.handle", "Handle is required");
            return Optional.empty();
        }
        var handle = JsText.trim(value.stringValue());
        if (!CF_HANDLE.matcher(handle).matches()) {
            issues.add("body.handle", "Handle must be 3-24 characters: letters, digits, _ - .");
            return Optional.empty();
        }
        return Optional.of(handle);
    }

    private static void unknownKeys(ObjectNode body, Issues issues) {
        var unknown = new ArrayList<String>();
        body.propertyNames().forEach(key -> {
            if (!"handle".equals(key)) {
                unknown.add(key);
            }
        });
        if (!unknown.isEmpty()) {
            var keys = unknown.stream().map(key -> "\"" + key + "\"").collect(Collectors.joining(", "));
            issues.add("body", "Unrecognized key%s: %s".formatted(unknown.size() > 1 ? "s" : "", keys));
        }
    }
}
