package com.algolearn.ratelimit;

import jakarta.servlet.http.HttpServletResponse;

/** IETF draft-7 headers, as the legacy rate limiter sent them. */
public final class RateLimitHeaders {

    public static final String POLICY = "RateLimit-Policy";
    public static final String STATE = "RateLimit";

    private RateLimitHeaders() {
    }

    public static void write(HttpServletResponse response, RateLimiter limiter, RateLimiter.Decision decision) {
        response.setHeader(POLICY, "%d;w=%d".formatted(limiter.limit(), limiter.windowSeconds()));
        response.setHeader(STATE, "limit=%d, remaining=%d, reset=%d"
                .formatted(limiter.limit(), decision.remaining(), decision.resetSeconds()));
    }
}
