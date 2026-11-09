package com.algolearn.support;

import java.sql.Types;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * An integration test that writes to the shared database: every table is emptied before each test.
 * Same context as {@link IntegrationTest}, so Spring reuses the cached application context.
 */
public abstract class DatabaseTest extends IntegrationTest {

    protected final JdbcTemplate jdbc;

    protected DatabaseTest(MockMvc mvc, JdbcTemplate jdbc) {
        super(mvc);
        this.jdbc = jdbc;
    }

    @BeforeEach
    void emptyTables() {
        jdbc.execute("TRUNCATE problems, users, submissions, topic_stats, stuck_queries, llm_cache, practice_items");
    }

    /** Inserts a minimal problem row (id like "10/A"; contest id and index come from it). */
    protected void insertProblem(String id, String source, String title, Integer rating, String... tags) {
        var parts = id.split("/");
        jdbc.update(connection -> {
            var ps = connection.prepareStatement("INSERT INTO problems (id, contest_id, idx, title, rating, tags, "
                    + "tag_count, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            ps.setString(1, id);
            ps.setInt(2, Integer.parseInt(parts[0]));
            ps.setString(3, parts[1]);
            ps.setString(4, title);
            ps.setObject(5, rating, Types.INTEGER);
            ps.setArray(6, connection.createArrayOf("text", tags));
            ps.setInt(7, tags.length);
            ps.setString(8, source);
            return ps;
        });
    }
}
