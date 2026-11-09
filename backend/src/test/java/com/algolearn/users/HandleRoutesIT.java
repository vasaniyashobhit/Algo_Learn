package com.algolearn.users;

import static com.algolearn.support.Handles.link;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.support.Accounts;
import com.algolearn.support.CfData;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Json;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy users.handle.link.routes.test.js. */
class HandleRoutesIT extends DatabaseTest {

    HandleRoutesIT(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc, jdbc);
    }

    @BeforeEach
    void knowTourist() {
        cf.withUser(CfData.user("tourist", 3382, 4009));
    }

    @Test
    void linksTheHandleWithCodeforcesCasingAndRating() throws Exception {
        var account = Accounts.signup(mvc);
        var result = link(mvc, account.token(), Map.of("handle", "  TOURIST "));
        assertThat(result.andReturn().getResponse().getStatus()).isEqualTo(200);
        var data = Json.body(result).get("data");
        assertThat(data.get("cfHandle").asString()).isEqualTo("tourist");
        assertThat(data.get("cfRating").asInt()).isEqualTo(3382);
        assertThat(data.get("cfMaxRating").asInt()).isEqualTo(4009);
        assertThat(cf.infoCalls.getLast()).isEqualTo("TOURIST");
    }

    @Test
    void canRelinkTheSameHandle() throws Exception {
        var account = Accounts.signup(mvc);
        link(mvc, account.token(), Map.of("handle", "tourist"));
        assertThat(link(mvc, account.token(), Map.of("handle", "Tourist")).andReturn().getResponse().getStatus())
                .isEqualTo(200);
    }

    @Test
    void answers404ForAnUnknownHandle() throws Exception {
        Json.expectError(link(mvc, Accounts.signup(mvc).token(), Map.of("handle", "no_such_user")), 404,
                "CF_HANDLE_NOT_FOUND");
    }

    @Test
    void answers409WhenAnotherAccountHasItInAnyCasing() throws Exception {
        link(mvc, Accounts.signup(mvc).token(), Map.of("handle", "tourist"));
        Json.expectError(link(mvc, Accounts.signup(mvc).token(), Map.of("handle", "TOURIST")), 409, "CF_HANDLE_TAKEN");
    }

    @Test
    void answers503WhenCodeforcesIsDown() throws Exception {
        cf.failInfo = CfData::down;
        var error = Json.expectError(link(mvc, Accounts.signup(mvc).token(), Map.of("handle", "tourist")), 503,
                "CF_UNAVAILABLE");
        assertThat(error.get("details").get("retryable").asBoolean()).isTrue();
    }

    static Stream<Arguments> badBodies() {
        var format = "body.handle: Handle must be 3-24 characters: letters, digits, _ - .";
        return Stream.of(Arguments.of(Map.of("handle", "ab"), format),
                Arguments.of(Map.of("handle", "a".repeat(25)), format),
                Arguments.of(Map.of("handle", "tour ist!"), format),
                Arguments.of(Map.of(), "body.handle: Handle is required"),
                Arguments.of(Map.of("handle", "tourist", "cfRating", 4000), "body: Unrecognized key: \"cfRating\""));
    }

    @ParameterizedTest
    @MethodSource("badBodies")
    void answers400ForABadHandle(Map<String, Object> body, String issue) throws Exception {
        var error = Json.expectError(link(mvc, Accounts.signup(mvc).token(), body), 400, "VALIDATION_FAILED");
        assertThat(Json.issues(error)).containsExactly(issue);
    }

    @Test
    void acceptsLettersDigitsUnderscoreDashAndDot() throws Exception {
        cf.withUser(CfData.user("A.b-C_1"));
        var data = Json.body(link(mvc, Accounts.signup(mvc).token(), Map.of("handle", "a.b-c_1"))).get("data");
        assertThat(data.get("cfHandle").asString()).isEqualTo("A.b-C_1");
    }

    @Test
    void answers401WithoutAToken() throws Exception {
        Json.expectError(link(mvc, null, Map.of("handle", "tourist")), 401, "AUTH_REQUIRED");
    }
}
