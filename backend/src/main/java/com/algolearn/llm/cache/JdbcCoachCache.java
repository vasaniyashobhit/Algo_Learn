package com.algolearn.llm.cache;

import com.algolearn.common.db.SqlTime;
import com.algolearn.llm.CachedAnswer;
import com.algolearn.llm.chain.LlmException;
import com.algolearn.llm.schema.CoachResponseParser;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.json.JsonMapper;

/**
 * Coach answers in {@code llm_cache} (legacy createCoachCache). Rows older than {@link #TTL} are ignored on read
 * even before the daily cleanup deletes them (the legacy TTL index removed them within about a minute).
 * Cached answers are re-validated on read; a row that no longer matches the schema is a miss. Database
 * failures are logged at warn and treated as a miss / skipped write, never thrown.
 */
public class JdbcCoachCache implements CoachCache {

    public static final Duration TTL = Duration.ofDays(30);
    private static final Logger LOG = LoggerFactory.getLogger(JdbcCoachCache.class);
    private static final String UPSERT = """
            INSERT INTO llm_cache (key, provider, model, response, created_at) VALUES (?, ?, ?, ?::jsonb, ?)
            ON CONFLICT ON CONSTRAINT uk_llm_cache_key DO UPDATE SET provider = EXCLUDED.provider,
              model = EXCLUDED.model, response = EXCLUDED.response,
              created_at = CASE WHEN llm_cache.created_at < ? THEN EXCLUDED.created_at ELSE llm_cache.created_at END
            """;

    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final JsonMapper mapper;

    public JdbcCoachCache(JdbcTemplate jdbc, Clock clock, JsonMapper mapper) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.mapper = mapper;
    }

    @Override
    public Optional<CachedAnswer> get(String key) {
        try {
            var rows = jdbc.query("SELECT provider, model, response::text AS response FROM llm_cache "
                    + "WHERE key = ? AND created_at >= ?", (rs, i) -> new Row(rs.getString("provider"),
                    rs.getString("model"), rs.getString("response")), key, SqlTime.of(cutoff()));
            if (rows.isEmpty()) {
                return Optional.empty();
            }
            var row = rows.getFirst();
            var answer = CoachResponseParser.validate(mapper.readTree(row.response()));
            return Optional.of(new CachedAnswer(answer, row.provider(), row.model()));
        } catch (RuntimeException e) {
            LOG.warn("LLM cache read failed, treated as a miss (key={}, err={})", key, LlmException.describe(e));
            return Optional.empty();
        }
    }

    /**
     * Upserts the answer. An existing row keeps its {@code created_at} (mongoose upsert), unless it has
     * already expired: then it counts as new, as if the TTL index had deleted it.
     */
    @Override
    public void set(String key, CachedAnswer value) {
        try {
            var now = SqlTime.of(clock.instant());
            jdbc.update(UPSERT, key, value.provider(), value.model(), mapper.writeValueAsString(value.answer()), now,
                    SqlTime.of(cutoff()));
        } catch (RuntimeException e) {
            LOG.warn("LLM cache write failed (key={}, err={})", key, LlmException.describe(e));
        }
    }

    private java.time.Instant cutoff() {
        return clock.instant().minus(TTL);
    }

    private record Row(String provider, String model, String response) {
    }
}
