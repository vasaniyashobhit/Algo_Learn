package com.algolearn.stats;

import java.util.List;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** Reads and writes the {@code topic_stats.last_results} jsonb column. */
@Component
public class LastResultsJson {

    private static final TypeReference<List<LastResult>> TYPE = new TypeReference<>() {
    };

    private final JsonMapper mapper;

    public LastResultsJson(JsonMapper mapper) {
        this.mapper = mapper;
    }

    public List<LastResult> read(String json) {
        return json == null || json.isBlank() ? List.of() : mapper.readValue(json, TYPE);
    }

    public String write(List<LastResult> results) {
        return mapper.writeValueAsString(results);
    }
}
