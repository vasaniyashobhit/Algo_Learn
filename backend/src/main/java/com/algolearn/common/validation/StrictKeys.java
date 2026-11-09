package com.algolearn.common.validation;

import java.util.ArrayList;
import java.util.Set;
import java.util.stream.Collectors;
import tools.jackson.databind.node.ObjectNode;

/** zod strictObject: one {@code body} issue naming every unknown key, in body order. */
public final class StrictKeys {

    private StrictKeys() {
    }

    public static void check(ObjectNode body, Set<String> allowed, String field, Issues issues) {
        var unknown = new ArrayList<String>();
        body.propertyNames().forEach(key -> {
            if (!allowed.contains(key)) {
                unknown.add(key);
            }
        });
        if (!unknown.isEmpty()) {
            var keys = unknown.stream().map(key -> "\"" + key + "\"").collect(Collectors.joining(", "));
            issues.add(field, "Unrecognized key%s: %s".formatted(unknown.size() > 1 ? "s" : "", keys));
        }
    }
}
