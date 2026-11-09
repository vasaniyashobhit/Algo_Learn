package com.algolearn.users;

import com.algolearn.auth.AuthFields;
import com.algolearn.common.validation.Issues;
import com.algolearn.common.validation.JsonBody;
import java.util.ArrayList;
import java.util.stream.Collectors;

/** PATCH /users/me body (legacy strict updateMeSchema): only {@code name}; any other key is an issue. */
public record UpdateMeRequest(String name) {

    public static UpdateMeRequest parse(JsonBody body) {
        var issues = new Issues();
        var object = body.object(issues);
        var name = object.flatMap(o -> AuthFields.name(o.get("name"), "body.name", issues));
        object.ifPresent(o -> {
            var unknown = new ArrayList<String>();
            o.propertyNames().forEach(key -> {
                if (!"name".equals(key)) {
                    unknown.add(key);
                }
            });
            if (!unknown.isEmpty()) {
                var keys = unknown.stream().map(key -> "\"" + key + "\"").collect(Collectors.joining(", "));
                issues.add("body", "Unrecognized key%s: %s".formatted(unknown.size() > 1 ? "s" : "", keys));
            }
        });
        issues.throwIfAny();
        return new UpdateMeRequest(name.orElseThrow());
    }
}
