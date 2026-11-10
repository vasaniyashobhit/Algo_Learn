package com.algolearn.stuck.gap;

/** One topic key of a problem with the user's strength (2 decimals, null = no stats), status and message. */
public record GapTopic(String topicKey, String kind, Double strength, String status, int attempted, String message) {
}
