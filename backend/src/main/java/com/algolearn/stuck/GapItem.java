package com.algolearn.stuck;

/** One topic of a stuck query's gap analysis; {@code strength} is null for an unseen topic. */
public record GapItem(String topicKey, String kind, Double strength, String status) {
}
