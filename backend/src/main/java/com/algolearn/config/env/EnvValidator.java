package com.algolearn.config.env;

import com.algolearn.config.AppProperties;
import java.util.function.Function;

/** Validates the environment and returns typed settings. Throws listing every problem at once. */
public final class EnvValidator {

    static final int JWT_SECRET_MIN = 32;
    static final int CRON_SECRET_MIN = 16;
    static final String DEFAULT_CLIENT_URL = "http://localhost:5173";
    static final String DEFAULT_SYNC_CRON = "0 */6 * * *";

    private EnvValidator() {
    }

    public static AppProperties parse(Function<String, String> source, boolean production) {
        var env = new EnvReader(source);
        var port = env.withDefault("PORT", "4000", EnvRules::isPort, "Must be an integer between 1 and 65535");
        env.required("DATABASE_URL", v -> v.startsWith("jdbc:postgresql://"), "Must be a jdbc:postgresql:// URL");
        env.required("DATABASE_USERNAME", v -> !v.isBlank(), "Must not be empty");
        env.required("DATABASE_PASSWORD", v -> true, "");
        var jwtSecret = env.required("JWT_SECRET", v -> EnvRules.minLength(v, JWT_SECRET_MIN),
                "Must be at least 32 characters");
        var jwtExpiresIn = env.withDefault("JWT_EXPIRES_IN", "7d", v -> !v.isBlank(), "Must not be empty");
        var clientUrl = env.withDefault("CLIENT_URL", DEFAULT_CLIENT_URL, EnvRules::isHttpUrl,
                "Must be a valid http(s) URL");
        var geminiKey = env.required("GEMINI_API_KEY", v -> !v.isBlank(), "Must not be empty");
        var models = env.required("GEMINI_MODELS", v -> !EnvRules.commaList(v).isEmpty(),
                "Provide at least one model");
        var cronSecret = env.required("CRON_SECRET", v -> EnvRules.minLength(v, CRON_SECRET_MIN),
                "Must be at least 16 characters");
        var syncCron = env.withDefault("SYNC_CRON", DEFAULT_SYNC_CRON, EnvRules::isCron,
                "Must be a valid cron expression");
        var logLevel = env.withDefault("LOG_LEVEL", "info", v -> EnvRules.LOG_LEVELS.contains(v),
                "Must be one of trace, debug, info, warn, error, fatal, off");
        if (!env.issues().isEmpty()) {
            throw new EnvValidationException(env.issues());
        }
        return new AppProperties(Integer.parseInt(port.trim()), jwtSecret, jwtExpiresIn,
                EnvRules.stripTrailingSlashes(clientUrl), geminiKey, EnvRules.commaList(models),
                env.optional("GROQ_API_KEY"), env.optional("GROQ_MODEL"), cronSecret, syncCron.trim(),
                logLevel, production);
    }
}
