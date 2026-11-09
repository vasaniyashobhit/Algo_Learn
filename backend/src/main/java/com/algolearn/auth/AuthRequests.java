package com.algolearn.auth;

import com.algolearn.common.validation.Issues;
import com.algolearn.common.validation.JsonBody;

/** Parses and validates the signup and login bodies (legacy signupSchema / loginSchema). */
public final class AuthRequests {

    private AuthRequests() {
    }

    /** Unknown keys are ignored (stripped), like the legacy non-strict schema. */
    public static SignupRequest signup(JsonBody body) {
        var issues = new Issues();
        var object = body.object(issues);
        var email = object.flatMap(o -> AuthFields.email(o.get("email"), "body.email", issues));
        var password = object.flatMap(o -> AuthFields.newPassword(o.get("password"), "body.password", issues));
        var name = object.flatMap(o -> AuthFields.name(o.get("name"), "body.name", issues));
        issues.throwIfAny();
        return new SignupRequest(email.orElseThrow(), password.orElseThrow(), name.orElseThrow());
    }

    public static LoginRequest login(JsonBody body) {
        var issues = new Issues();
        var object = body.object(issues);
        var email = object.flatMap(o -> AuthFields.email(o.get("email"), "body.email", issues));
        var password = object.flatMap(o -> AuthFields.loginPassword(o.get("password"), "body.password", issues));
        issues.throwIfAny();
        return new LoginRequest(email.orElseThrow(), password.orElseThrow());
    }

    /** A validated signup: normalized email and name, the password as given. */
    public record SignupRequest(String email, String password, String name) {

        @Override
        public String toString() {
            return "SignupRequest[email=%s, name=%s]".formatted(email, name);
        }
    }

    /** A validated login. */
    public record LoginRequest(String email, String password) {

        @Override
        public String toString() {
            return "LoginRequest[email=%s]".formatted(email);
        }
    }
}
