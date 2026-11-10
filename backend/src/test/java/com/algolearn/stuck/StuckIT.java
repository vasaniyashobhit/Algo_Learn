package com.algolearn.stuck;

import static com.algolearn.support.Accounts.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import com.algolearn.problems.Problem;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.stuck.url.UrlFakes;
import com.algolearn.support.Accounts;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Json;
import com.algolearn.support.Problems;
import com.algolearn.support.StuckDoubles;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockPart;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;

/** Legacy tests/helpers/stuckRoutes.js: the full app with the fake LLM, OCR, fetch and DNS (reset per test). */
public abstract class StuckIT extends DatabaseTest {

    public static final String PATH = "/api/v1/stuck";

    protected final StuckDoubles.FakeAi ai;
    protected final StuckDoubles.FakeOcr ocr;
    protected final UrlFakes.Hosts hosts;
    protected final UrlFakes.Pages pages;
    protected final ProblemRepository problems;

    protected StuckIT(MockMvc mvc, JdbcTemplate jdbc, StuckDoubles.FakeAi ai, StuckDoubles.FakeOcr ocr,
            UrlFakes.Hosts hosts, UrlFakes.Pages pages, ProblemRepository problems) {
        super(mvc, jdbc);
        this.ai = ai;
        this.ocr = ocr;
        this.hosts = hosts;
        this.pages = pages;
        this.problems = problems;
    }

    @BeforeEach
    void resetFakes() {
        ai.reset();
        ocr.text = "";
        ocr.calls = 0;
        hosts.clear();
        pages.clear();
    }

    /** Signs up and returns the token. */
    protected String user() throws Exception {
        return Accounts.signup(mvc).token();
    }

    protected MvcResult postStuck(String token, Object body) throws Exception {
        return mvc.perform(bearer(Accounts.postJson(PATH, body), token)).andReturn();
    }

    protected MvcResult upload(String token, String inputType, byte[] bytes, String type) throws Exception {
        var file = new MockPart("file", "input", bytes);
        file.getHeaders().setContentType(MediaType.parseMediaType(type));
        var field = new MockPart("inputType", inputType.getBytes(StandardCharsets.UTF_8));
        return mvc.perform(multipart(PATH).part(field, file).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andReturn();
    }

    /** Legacy expectErrorShape on a finished request: status, code, request id; returns the error object. */
    protected static JsonNode error(MvcResult result, int status, String code) throws Exception {
        assertThat(result.getResponse().getStatus()).isEqualTo(status);
        var error = Json.body(result).get("error");
        assertThat(error.get("code").asString()).isEqualTo(code);
        assertThat(error.get("requestId").asString()).isEqualTo(result.getResponse().getHeader("X-Request-Id"));
        return error;
    }

    protected static JsonNode data(MvcResult result) throws Exception {
        return Json.body(result).get("data");
    }

    /** A stored problem with a statement, rating, tags and (when given) an editorial. */
    protected void seed(String id, String title, String description, Integer rating, String editorial,
            String... tags) {
        Problem problem = Problems.at(id, rating, tags);
        problem.setTitle(title);
        problem.setDescription(description);
        problem.setEditorial(editorial == null ? "" : editorial);
        problem.setHasEditorial(editorial != null && !editorial.isBlank());
        problems.saveAllAndFlush(List.of(problem));
    }
}
