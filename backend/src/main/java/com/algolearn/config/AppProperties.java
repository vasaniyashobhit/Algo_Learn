package com.algolearn.config;

import java.util.List;
import java.util.Optional;

/**
 * Validated settings from the environment (built by EnvValidator). {@link #toString()} hides
 * every secret so the record is safe to log.
 */
public record AppProperties(
        int port,
        String jwtSecret,
        String jwtExpiresIn,
        String clientUrl,
        String geminiApiKey,
        List<String> geminiModels,
        Optional<String> groqApiKey,
        Optional<String> groqModel,
        String cronSecret,
        String syncCron,
        String logLevel,
        boolean production) {

    public AppProperties {
        geminiModels = List.copyOf(geminiModels);
    }

    @Override
    public String toString() {
        return "AppProperties[port=%d, clientUrl=%s, geminiModels=%s, groqModel=%s, syncCron=%s, production=%s]"
                .formatted(port, clientUrl, geminiModels, groqModel.orElse("-"), syncCron, production);
    }
}
