package com.algolearn.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import com.algolearn.common.validation.JsonBody;
import com.algolearn.support.Json;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Legacy auth.schema.test.js (signupSchema / loginSchema). */
class AuthRequestsTest {

    private static JsonBody body(String email, String password, String name) {
        var node = Json.MAPPER.createObjectNode().put("email", email).put("password", password).put("name", name);
        return new JsonBody(node);
    }

    static List<String> messages(Runnable parse) {
        var error = catchThrowableOfType(ValidationException.class, parse::run);
        return error == null ? List.of() : ((List<?>) error.details()).stream()
                .map(issue -> ((FieldIssue) issue).message()).toList();
    }

    @Test
    void trimsAndLowercasesTheEmailAndTrimsTheName() {
        var request = AuthRequests.signup(body("Coder@Example.com ", "secret123", "  Ada  "));
        assertThat(request).isEqualTo(new AuthRequests.SignupRequest("coder@example.com", "secret123", "Ada"));
        assertThat(request.toString()).doesNotContain("secret123");
    }

    @Test
    void rejectsAnInvalidEmail() {
        assertThat(messages(() -> AuthRequests.signup(body("not-an-email", "secret123", "Ada"))))
                .containsExactly("Invalid email address");
        assertThat(messages(() -> AuthRequests.signup(body("a".repeat(250) + "@b.co", "secret123", "Ada"))))
                .containsExactly("Email is too long");
    }

    @ParameterizedTest
    @CsvSource({"short1, Password must be at least 8 characters", "12345678, Password must contain at least one letter",
        "abcdefgh, Password must contain at least one digit"})
    void rejectsWeakPasswords(String password, String message) {
        assertThat(messages(() -> AuthRequests.signup(body("a@b.co", password, "Ada")))).contains(message);
    }

    @Test
    void rejectsPasswordsOver72BytesAndAcceptsExactly72() {
        var tooLong = "Password must be at most 72 bytes";
        assertThat(messages(() -> AuthRequests.signup(body("a@b.co", "a1" + "x".repeat(71), "Ada")))).contains(tooLong);
        assertThat(messages(() -> AuthRequests.signup(body("a@b.co", "a1" + "é".repeat(36), "Ada")))).contains(tooLong);
        assertThat(messages(() -> AuthRequests.signup(body("a@b.co", "a1" + "x".repeat(70), "Ada")))).isEmpty();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {"A|Name must be at least 2 characters",
        "'   B  '|Name must be at least 2 characters"})
    void rejectsShortNames(String name, String message) {
        assertThat(messages(() -> AuthRequests.signup(body("a@b.co", "secret123", name)))).containsExactly(message);
    }

    @Test
    void acceptsNamesOf2And50CharactersAndRejects51() {
        assertThat(messages(() -> AuthRequests.signup(body("a@b.co", "secret123", "Al")))).isEmpty();
        assertThat(messages(() -> AuthRequests.signup(body("a@b.co", "secret123", "n".repeat(50))))).isEmpty();
        assertThat(messages(() -> AuthRequests.signup(body("a@b.co", "secret123", "n".repeat(51)))))
                .containsExactly("Name must be at most 50 characters");
    }

    @Test
    void reportsEveryMissingFieldInOrder() {
        var error = catchThrowableOfType(ValidationException.class,
                () -> AuthRequests.signup(new JsonBody(Json.MAPPER.createObjectNode())));
        assertThat(error.details()).isEqualTo(List.of(new FieldIssue("body.email", "Email is required"),
                new FieldIssue("body.password", "Password is required"),
                new FieldIssue("body.name", "Name is required")));
    }

    @Test
    void loginNormalizesTheEmailAndKeepsThePasswordAsGiven() {
        var node = Json.MAPPER.createObjectNode().put("email", " A@B.co ").put("password", " x ");
        assertThat(AuthRequests.login(new JsonBody(node))).isEqualTo(new AuthRequests.LoginRequest("a@b.co", " x "));
        assertThat(AuthRequests.login(new JsonBody(node)).toString()).doesNotContain(" x ");
    }

    @Test
    void loginSkipsTheSignupRulesButRequiresASaneLength() {
        var node = Json.MAPPER.createObjectNode().put("email", "a@b.co");
        assertThat(messages(() -> AuthRequests.login(new JsonBody(node.put("password", "short"))))).isEmpty();
        assertThat(messages(() -> AuthRequests.login(new JsonBody(node.put("password", "")))))
                .containsExactly("Password is required");
        assertThat(messages(() -> AuthRequests.login(new JsonBody(node.put("password", "x".repeat(257))))))
                .containsExactly("Password is too long");
    }
}
