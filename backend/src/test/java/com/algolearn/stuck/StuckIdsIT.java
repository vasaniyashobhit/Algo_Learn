package com.algolearn.stuck;

import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.stuck.url.UrlFakes;
import com.algolearn.support.Accounts;
import com.algolearn.support.StuckDoubles;
import java.util.Locale;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Stuck ids keep the legacy ObjectId form (the frontend routes and E2E tests expect /stuck/<24 hex>). */
class StuckIdsIT extends StuckIT {

    StuckIdsIT(MockMvc mvc, JdbcTemplate jdbc, StuckDoubles.FakeAi ai, StuckDoubles.FakeOcr ocr,
            UrlFakes.Hosts hosts, UrlFakes.Pages pages, ProblemRepository problems) {
        super(mvc, jdbc, ai, ocr, hosts, pages, problems);
    }

    @Test
    void idsAreTwentyFourLowerCaseHexDigitsStartingWithTheSeconds() throws Exception {
        var token = user();
        var id = data(postStuck(token, Map.of("inputType", "text", "text", STATEMENT))).get("id").asString();
        assertThat(id).matches("[0-9a-f]{24}").startsWith("%08x".formatted(clock.millis() / 1000));
        var upper = mvc.perform(Accounts.bearer(get(PATH + "/" + id.toUpperCase(Locale.ROOT)), token)).andReturn();
        assertThat(upper.getResponse().getStatus()).as("any case, like an ObjectId").isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT id FROM stuck_queries", String.class)).isEqualTo(id);
    }

    @Test
    void theColumnRefusesOtherFormatsAndDefaultsToTheSameForm() {
        var user = jdbc.queryForObject("INSERT INTO users (email, password_hash, name) VALUES ('x@y.z', 'h', 'X') "
                + "RETURNING id", java.util.UUID.class);
        var insert = "INSERT INTO stuck_queries (user_id, input_type, source) VALUES (?, 'text', 'ai') RETURNING id";
        assertThat(jdbc.queryForObject(insert, String.class, user)).matches("[0-9a-f]{24}");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update("INSERT INTO stuck_queries (id, user_id, "
                + "input_type, source) VALUES ('NOT-HEX', ?, 'text', 'ai')", user))
                .hasMessageContaining("ck_stuck_queries_id");
    }
}
