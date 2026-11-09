package com.algolearn.common.http;

/** Backoff settings; {@link #DEFAULT} matches the legacy retry helper (3 retries, 200 ms, 5 s cap, x2). */
public record RetryPolicy(int retries, long baseMs, long maxMs, double factor) {

    public static final RetryPolicy DEFAULT = new RetryPolicy(3, 200, 5_000, 2);
}
