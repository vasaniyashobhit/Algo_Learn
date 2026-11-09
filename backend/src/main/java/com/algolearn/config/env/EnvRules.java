package com.algolearn.config.env;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.springframework.scheduling.support.CronExpression;

/** Small, pure checks used by {@link EnvValidator}. */
final class EnvRules {

    static final Set<String> LOG_LEVELS = Set.of("trace", "debug", "info", "warn", "error", "fatal", "off");
    private static final int CRON_FIELDS = 5;
    private static final int MAX_PORT = 65_535;

    private EnvRules() {
    }

    static boolean minLength(String value, int min) {
        return value.length() >= min;
    }

    static boolean isPort(String value) {
        try {
            var port = Integer.parseInt(value.trim());
            return port >= 1 && port <= MAX_PORT;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    static boolean isHttpUrl(String value) {
        try {
            var uri = new URI(value.trim());
            var scheme = uri.getScheme();
            return uri.getHost() != null && ("http".equals(scheme) || "https".equals(scheme));
        } catch (URISyntaxException e) {
            return false;
        }
    }

    /** CORS compares CLIENT_URL with the Origin header exactly, which never ends in a slash. */
    static String stripTrailingSlashes(String url) {
        return url.trim().replaceAll("/+$", "");
    }

    static List<String> commaList(String value) {
        return Arrays.stream(value.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    /** A 5-field cron expression like node-cron's (minute hour day month weekday). */
    static boolean isCron(String value) {
        var trimmed = value.trim();
        if (trimmed.split("\\s+").length != CRON_FIELDS) {
            return false;
        }
        return CronExpression.isValidExpression("0 " + trimmed);
    }
}
