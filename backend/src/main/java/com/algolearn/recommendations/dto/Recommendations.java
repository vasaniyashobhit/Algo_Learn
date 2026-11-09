package com.algolearn.recommendations.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** GET /recommendations: {@code data} and {@code meta}. */
public record Recommendations(Data data, Meta meta) {

    /** {@code { topics }}. */
    public record Data(List<RecommendedTopic> topics) {

        public Data {
            topics = List.copyOf(topics);
        }
    }

    /** {@code reason} (NO_HANDLE / NOT_SYNCED) only when set, as in the topic stats meta. */
    public record Meta(Integer userRating, int frequencyRating, boolean coldStart, int recentFailed,
            @JsonInclude(JsonInclude.Include.NON_NULL) String reason) {
    }
}
