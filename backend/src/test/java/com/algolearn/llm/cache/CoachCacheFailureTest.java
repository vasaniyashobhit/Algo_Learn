package com.algolearn.llm.cache;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.CachedAnswer;
import com.algolearn.llm.LlmFakes;
import com.algolearn.llm.LogCapture;
import com.algolearn.llm.schema.CoachResponseParser;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

/** Ports the "database fails" case of legacy cache.test.js, and the offline (no) cache. */
class CoachCacheFailureTest {

    private final CachedAnswer gemini =
            new CachedAnswer(CoachResponseParser.parse(LlmFakes.coachJson()), "gemini", "a");

    @Test
    void logsAndContinuesWhenTheDatabaseFails() {
        var broken = Mockito.mock(JdbcTemplate.class, invocation -> {
            throw new DataAccessResourceFailureException("db down");
        });
        var failing = new JdbcCoachCache(broken, LlmFakes.clockAt(0), LlmFakes.MAPPER);
        try (var logs = new LogCapture(JdbcCoachCache.class)) {
            assertThat(failing.get("problem:1/A")).isEmpty();
            failing.set("problem:1/A", gemini);
            assertThat(logs.messages("WARN")).hasSize(2);
        }
    }

    @Test
    void theNoneCacheNeverHits() {
        CoachCache.NONE.set("k", gemini);
        assertThat(CoachCache.NONE.get("k")).isEmpty();
    }
}
