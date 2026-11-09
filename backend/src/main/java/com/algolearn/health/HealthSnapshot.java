package com.algolearn.health;

/** {@code { status: ok|degraded, db: up|down, uptime: seconds, time: ISO-8601 UTC }}. */
public record HealthSnapshot(String status, String db, double uptime, String time) {
}
