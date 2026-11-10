package com.algolearn.llm;

import java.time.Instant;
import java.util.List;

/**
 * Input of {@code getCoachAnswer}: any field may be null. {@code deadline} bounds the whole chain
 * (null = now + {@link LlmConstants#DEADLINE_MS}).
 */
public record CoachRequest(String problemId, String text, List<String> knownTags, Instant deadline) {

    public CoachRequest {
        knownTags = knownTags == null ? List.of() : knownTags.stream().filter(t -> t != null).toList();
    }

    public static CoachRequest ofText(String text) {
        return new CoachRequest(null, text, List.of(), null);
    }
}
