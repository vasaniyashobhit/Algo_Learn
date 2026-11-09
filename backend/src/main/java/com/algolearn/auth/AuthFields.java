package com.algolearn.auth;

import com.algolearn.common.validation.Issues;
import com.algolearn.common.validation.JsText;
import java.util.Optional;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;

/**
 * The legacy zod field rules for email, password and name, with the same messages in the same
 * order. Each method adds its issues and returns the normalized value only when it is valid.
 */
public final class AuthFields {

    /** bcrypt only uses the first 72 bytes of a password, so longer ones are rejected at signup. */
    public static final int PASSWORD_MAX_BYTES = 72;

    /** zod 4's email pattern. */
    static final Pattern EMAIL = Pattern.compile("^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]"
            + "@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$");
    private static final Pattern LETTER = Pattern.compile("[A-Za-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");

    private AuthFields() {
    }

    /** Trimmed and lower-cased, a valid email of at most 254 characters. */
    public static Optional<String> email(JsonNode value, String field, Issues issues) {
        return string(value, field, "Email is required", issues).flatMap(raw -> {
            var email = JsText.lower(JsText.trim(raw));
            return check(email, issues, field,
                    EMAIL.matcher(email).matches() ? null : "Invalid email address",
                    email.length() > 254 ? "Email is too long" : null);
        });
    }

    /** Signup rules: at least 8 characters, a letter, a digit, at most 72 bytes. Not trimmed. */
    public static Optional<String> newPassword(JsonNode value, String field, Issues issues) {
        return string(value, field, "Password is required", issues).flatMap(password -> check(password, issues, field,
                password.length() < 8 ? "Password must be at least 8 characters" : null,
                LETTER.matcher(password).find() ? null : "Password must contain at least one letter",
                DIGIT.matcher(password).find() ? null : "Password must contain at least one digit",
                JsText.byteLength(password) > PASSWORD_MAX_BYTES
                        ? "Password must be at most " + PASSWORD_MAX_BYTES + " bytes" : null));
    }

    /** Login only checks that a password of sane length was sent. */
    public static Optional<String> loginPassword(JsonNode value, String field, Issues issues) {
        return string(value, field, "Password is required", issues).flatMap(password -> check(password, issues, field,
                password.isEmpty() ? "Password is required" : null,
                password.length() > 256 ? "Password is too long" : null));
    }

    /** Trimmed, 2–50 characters. */
    public static Optional<String> name(JsonNode value, String field, Issues issues) {
        return string(value, field, "Name is required", issues).flatMap(raw -> {
            var name = JsText.trim(raw);
            return check(name, issues, field,
                    name.length() < 2 ? "Name must be at least 2 characters" : null,
                    name.length() > 50 ? "Name must be at most 50 characters" : null);
        });
    }

    private static Optional<String> string(JsonNode value, String field, String required, Issues issues) {
        if (value == null || !value.isString()) {
            issues.add(field, required);
            return Optional.empty();
        }
        return Optional.of(value.stringValue());
    }

    private static Optional<String> check(String value, Issues issues, String field, String... problems) {
        var valid = true;
        for (var problem : problems) {
            if (problem != null) {
                issues.add(field, problem);
                valid = false;
            }
        }
        return valid ? Optional.of(value) : Optional.empty();
    }
}
