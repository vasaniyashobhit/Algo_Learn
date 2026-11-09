package com.algolearn.support;

import com.algolearn.config.AppProperties;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Valid settings and env maps for unit tests (like the legacy envFactory). */
public final class TestProperties {

    private TestProperties() {
    }

    public static AppProperties app(boolean production) {
        return new AppProperties(4000, "x".repeat(32), "7d", "http://localhost:5173", "key",
                List.of("gemini-a"), Optional.empty(), Optional.empty(), "c".repeat(16), "0 */6 * * *",
                "info", production);
    }

    /** A complete, valid env. Override or remove keys per test. */
    public static Map<String, String> env() {
        var env = new HashMap<String, String>();
        env.put("PORT", "4000");
        env.put("DATABASE_URL", "jdbc:postgresql://localhost:5432/algolearn");
        env.put("DATABASE_USERNAME", "algolearn");
        env.put("DATABASE_PASSWORD", "secret");
        env.put("JWT_SECRET", "x".repeat(32));
        env.put("JWT_EXPIRES_IN", "7d");
        env.put("CLIENT_URL", "http://localhost:5173");
        env.put("GEMINI_API_KEY", "test-gemini-key");
        env.put("GEMINI_MODELS", "gemini-a, gemini-b");
        env.put("CRON_SECRET", "c".repeat(16));
        return env;
    }
}
