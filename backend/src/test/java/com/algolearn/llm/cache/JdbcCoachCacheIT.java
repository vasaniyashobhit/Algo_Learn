package com.algolearn.llm.cache;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.CachedAnswer;
import com.algolearn.llm.LlmFakes;
import com.algolearn.llm.LogCapture;
import com.algolearn.llm.schema.CoachResponseParser;
import com.algolearn.support.DatabaseTest;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Ports legacy cache.test.js and llmCache.model.test.js on llm_cache, plus the 30-day read TTL. */
class JdbcCoachCacheIT extends DatabaseTest {

    private static final Instant NOW = Instant.parse("2026-11-10T12:00:00Z");
    private final CoachCache cache;
    private final CachedAnswer gemini =
            new CachedAnswer(CoachResponseParser.parse(LlmFakes.coachJson()), "gemini", "a");

    JdbcCoachCacheIT(MockMvc mvc, JdbcTemplate jdbc, CoachCache cache) {
        super(mvc, jdbc);
        this.cache = cache;
    }

    private Instant createdAt(String key) {
        return jdbc.queryForObject("SELECT created_at FROM llm_cache WHERE key = ?", OffsetDateTime.class, key)
                .toInstant();
    }

    @Test
    void missesThenReturnsWhatWasSet() {
        clock.set(NOW);
        assertThat(cache.get("problem:1/A")).isEmpty();
        cache.set("problem:1/A", gemini);
        assertThat(cache.get("problem:1/A")).contains(gemini);
        assertThat(createdAt("problem:1/A")).isEqualTo(NOW);
    }

    @Test
    void overwritesAnExistingKeyAndKeepsItsCreatedAt() {
        clock.set(NOW);
        cache.set("text:abc", gemini);
        clock.advance(Duration.ofDays(1));
        cache.set("text:abc", new CachedAnswer(gemini.answer(), "groq", "g"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM llm_cache WHERE key = 'text:abc'", Integer.class))
                .isEqualTo(1);
        assertThat(cache.get("text:abc")).get().extracting(CachedAnswer::provider).isEqualTo("groq");
        assertThat(createdAt("text:abc")).isEqualTo(NOW);
    }

    @Test
    void ignoresRowsOlderThan30DaysBeforeTheCleanupDeletesThem() {
        clock.set(NOW);
        cache.set("problem:1/A", gemini);
        clock.set(NOW.plus(Duration.ofDays(30)));
        assertThat(cache.get("problem:1/A")).contains(gemini);
        clock.set(NOW.plus(Duration.ofDays(30)).plusMillis(1));
        assertThat(cache.get("problem:1/A")).isEmpty();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM llm_cache", Integer.class)).isEqualTo(1);
    }

    @Test
    void anExpiredRowThatIsOverwrittenCountsAsNew() {
        clock.set(NOW);
        cache.set("problem:1/A", gemini);
        var later = NOW.plus(Duration.ofDays(31));
        clock.set(later);
        cache.set("problem:1/A", new CachedAnswer(gemini.answer(), "groq", "g"));
        assertThat(createdAt("problem:1/A")).isEqualTo(later);
        assertThat(cache.get("problem:1/A")).get().extracting(CachedAnswer::model).isEqualTo("g");
    }

    @Test
    void treatsARowThatNoLongerMatchesTheSchemaAsAMiss() {
        jdbc.update("INSERT INTO llm_cache (key, provider, model, response) VALUES ('problem:2/B', 'gemini', 'a', "
                + "'{\"tags\":[\"dp\"]}'::jsonb)");
        try (var logs = new LogCapture(JdbcCoachCache.class)) {
            assertThat(cache.get("problem:2/B")).isEmpty();
            assertThat(logs.messages("WARN")).hasSize(1);
        }
    }
}
