package com.algolearn.stuck;

import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.stuck.url.UrlFakes;
import com.algolearn.support.Accounts;
import com.algolearn.support.Json;
import com.algolearn.support.StuckDoubles;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy stuck.solve.routes.test.js: body validation and authentication of POST /stuck. */
class StuckValidationIT extends StuckIT {

    StuckValidationIT(MockMvc mvc, JdbcTemplate jdbc, StuckDoubles.FakeAi ai, StuckDoubles.FakeOcr ocr,
            UrlFakes.Hosts hosts, UrlFakes.Pages pages, ProblemRepository problems) {
        super(mvc, jdbc, ai, ocr, hosts, pages, problems);
    }

    @Test
    void validatesTheBodyAndTheTextLengthSavingNothing() throws Exception {
        var token = user();
        var missing = error(postStuck(token, Map.of()), 400, "VALIDATION_FAILED");
        assertThat(Json.fields(missing)).containsExactly("body.inputType");
        var tooShort = error(postStuck(token, Map.of("inputType", "text", "text", "too short")), 400,
                "PROBLEM_TEXT_TOO_SHORT");
        assertThat(tooShort.get("details")).isEqualTo(Json.parse("{\"minLength\":40,\"length\":9}"));
        assertThat(Json.fields(error(postStuck(token, Map.of("inputType", "text")), 400, "VALIDATION_FAILED")))
                .containsExactly("body.text");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM stuck_queries", Long.class)).isZero();
    }

    @Test
    void requiresAuthentication() throws Exception {
        var res = mvc.perform(Accounts.postJson(PATH, Map.of("inputType", "text", "text", STATEMENT))).andReturn();
        error(res, 401, "AUTH_REQUIRED");
    }
}
