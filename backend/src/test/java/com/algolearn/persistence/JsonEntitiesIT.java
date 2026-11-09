package com.algolearn.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.LlmCache;
import com.algolearn.llm.LlmCacheRepository;
import com.algolearn.stuck.GapItem;
import com.algolearn.stuck.StuckQuery;
import com.algolearn.stuck.StuckQueryRepository;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Users;
import com.algolearn.users.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Stuck queries and the LLM cache: free-form jsonb and text[] round-trips (legacy model tests). */
class JsonEntitiesIT extends DatabaseTest {

    private final UserRepository users;
    private final StuckQueryRepository stuck;
    private final LlmCacheRepository cache;

    JsonEntitiesIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, StuckQueryRepository stuck,
            LlmCacheRepository cache) {
        super(mvc, jdbc);
        this.users = users;
        this.stuck = stuck;
        this.cache = cache;
    }

    private UUID userId() {
        return users.saveAndFlush(Users.user()).getId();
    }

    @Test
    void stuckQueriesTruncateRawInputAndStoreGapAndFreeFormResult() {
        assertThat(StuckQuery.truncateRawInput("x".repeat(25_000))).hasSize(20_000);
        assertThat(StuckQuery.truncateRawInput("short")).isEqualTo("short");
        assertThat(StuckQuery.truncateRawInput(null)).isNull();
        var query = new StuckQuery();
        query.setUserId(userId());
        query.setInputType("text");
        query.setRawInput("a".repeat(30_000));
        query.setSource("ai");
        query.setGap(List.of(new GapItem("dp+graphs", "pair", null, "unseen")));
        query.setResult(Map.of("hints", List.of("h1"), "nested", Map.of("a", 1)));
        var saved = stuck.findById(stuck.saveAndFlush(query).getId()).orElseThrow();
        assertThat(saved.getRawInput()).hasSize(20_000);
        assertThat(saved.getGap()).containsExactly(new GapItem("dp+graphs", "pair", null, "unseen"));
        assertThat(saved.getResult()).isEqualTo(Map.of("hints", List.of("h1"), "nested", Map.of("a", 1)));
        assertThat(saved.getSolution()).isNull();
        assertThat(saved.getDetectedTags()).isEmpty();
        assertThat(saved.getCreatedAt()).isNotNull();
        query.setRawInput(null);
        assertThat(query.getRawInput()).isEmpty();
    }

    @Test
    void llmCacheStoresAFreeFormResponseByKey() {
        var entry = new LlmCache();
        entry.setKey("problem:1/A");
        entry.setProvider("gemini");
        entry.setModel("gemini-a");
        entry.setResponse(Map.of("solution", "x", "nested", Map.of("a", List.of(1))));
        cache.saveAndFlush(entry);
        var saved = cache.findByKey("problem:1/A").orElseThrow();
        assertThat(saved.getResponse()).isEqualTo(Map.of("solution", "x", "nested", Map.of("a", List.of(1))));
        assertThat(saved.getCreatedAt()).isNotNull();
    }
}
