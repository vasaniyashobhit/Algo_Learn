package com.algolearn.common.validation;

import java.util.Optional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * The raw JSON request body (null when there is none or it is not JSON), resolved by
 * {@link JsonBodyResolver}. Validators read it like zod reads {@code req.body}.
 */
public record JsonBody(JsonNode node) {

    /** zod's name for a value's type, as used in "expected object, received array". */
    public static String typeOf(JsonNode value) {
        if (value == null || value.isMissingNode()) {
            return "undefined";
        }
        if (value.isNull()) {
            return "null";
        }
        if (value.isArray()) {
            return "array";
        }
        if (value.isObject()) {
            return "object";
        }
        return value.isString() ? "string" : value.isBoolean() ? "boolean" : "number";
    }

    /** The body as an object, or an issue on {@code body} when it is something else. */
    public Optional<ObjectNode> object(Issues issues) {
        if (node instanceof ObjectNode object) {
            return Optional.of(object);
        }
        issues.add("body", "Invalid input: expected object, received " + typeOf(node));
        return Optional.empty();
    }
}
