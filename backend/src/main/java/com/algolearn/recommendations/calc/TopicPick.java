package com.algolearn.recommendations.calc;

/** One picked topic (legacy pickNextTopics entry); {@code priority} is null outside the learning zone. */
public record TopicPick(String topic, String basis, Double strength, int attempted, int solved,
        Integer comfortRating, double frequency, Double priority, String reason) {
}
