package com.algolearn.practice;

import static com.algolearn.support.Accounts.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.CfData;
import com.algolearn.support.Handles;
import com.algolearn.support.Json;
import com.algolearn.support.Problems;
import com.algolearn.sync.SubmissionWriter;
import com.algolearn.sync.SyncLock;
import com.algolearn.users.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Legacy practice.verify.routes.test.js (the real 20 s cooldown applies). */
class VerifyRoutesIT extends VerifyTestBase {

    private static final String VERIFY = "/api/v1/practice/50/b/verify";

    VerifyRoutesIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            UserRepository users, SyncLock lock, SubmissionWriter writer, PracticeQueries practice,
            VerifyQueries queries) {
        super(mvc, jdbc, problems, search, users, lock, writer, practice, queries);
    }

    private String linked(List<com.algolearn.codeforces.dto.CfSubmission> submissions) throws Exception {
        seed(Problems.at("50/B"));
        cf.withUser(CfData.user("tourist")).withSubmissions(submissions);
        return Handles.linkedAccount(mvc, "tourist").token();
    }

    private ResultActions verify(String token, String url) throws Exception {
        return mvc.perform(token == null ? post(url) : bearer(post(url), token));
    }

    @Test
    void syncsFindsTheOkAndReturnsVerifiedTrueWithTheItem() throws Exception {
        var token = linked(List.of(on(1, 50, "B", "OK")));
        var result = verify(token, VERIFY);
        assertThat(result.andReturn().getResponse().getStatus()).isEqualTo(200);
        var data = Json.body(result).get("data");
        assertThat(data.propertyNames()).containsExactly("verified", "item");
        assertThat(data.get("verified").asBoolean()).isTrue();
        PracticeTestBase.expectItem(data.get("item"), "50/B", "solved", "recommendation");
        var list = Json.body(mvc.perform(bearer(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/v1/practice?status=solved"), token)));
        assertThat(list.get("data").get(0).get("problemId").asString()).isEqualTo("50/B");
        assertThat(list.get("data").size()).isEqualTo(1);
    }

    @Test
    void answers200VerifiedFalseWithAReasonWhenNotSolvedOrStillJudging() throws Exception {
        var token = linked(List.of(on(2, 50, "B", "TESTING"), on(1, 50, "B", "WRONG_ANSWER")));
        var result = verify(token, VERIFY);
        assertThat(result.andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(Json.body(result)).isEqualTo(Json.parse(
                "{\"success\":true,\"data\":{\"verified\":false,\"reason\":\"STILL_JUDGING\"}}"));
    }

    @Test
    void answers429RateLimitedForASecondCheckInsideTheCooldownWhenNotSolved() throws Exception {
        var token = linked(List.of(on(1, 50, "B", "WRONG_ANSWER")));
        assertThat(Json.body(verify(token, VERIFY)).get("data").get("reason").asString()).isEqualTo("NOT_SOLVED_YET");
        var error = Json.expectError(verify(token, VERIFY), 429, "RATE_LIMITED");
        assertThat(error.get("details").get("retryAfterSeconds").isNumber()).isTrue();
    }

    @Test
    void answers404ProblemNotFound400ForBadParams400CfHandleNotLinked() throws Exception {
        seed(Problems.at("50/B"));
        var token = com.algolearn.support.Accounts.signup(mvc).token();
        Json.expectError(verify(token, "/api/v1/practice/99/Z/verify"), 404, "PROBLEM_NOT_FOUND");
        assertThat(verify(token, "/api/v1/practice/0/B/verify").andReturn().getResponse().getStatus()).isEqualTo(400);
        Json.expectError(verify(token, VERIFY), 400, "CF_HANDLE_NOT_LINKED");
    }

    @Test
    void answers401AuthRequiredWithoutAToken() throws Exception {
        Json.expectError(verify(null, VERIFY), 401, "AUTH_REQUIRED");
    }
}
