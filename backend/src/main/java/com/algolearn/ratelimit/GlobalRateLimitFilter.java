package com.algolearn.ratelimit;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.RateLimitException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * All /api routes: 300 requests per 15 minutes per IP (default), with draft-7 RateLimit headers.
 * Over the limit → 429 RATE_LIMITED, {@code details: { retryAfterSeconds: <window seconds> }}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 6)
public class GlobalRateLimitFilter extends OncePerRequestFilter {

    public static final String MESSAGE = "Too many requests, please slow down";

    private final RateLimiter limiter;

    public GlobalRateLimitFilter(
            @Value("${algolearn.rate-limit.global.limit:300}") long limit,
            @Value("${algolearn.rate-limit.global.window:15m}") Duration window) {
        this.limiter = new RateLimiter(limit, window);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        var path = request.getRequestURI();
        return !(path.equals("/api") || path.startsWith("/api/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var decision = limiter.tryConsume("ip:" + request.getRemoteAddr());
        RateLimitHeaders.write(response, limiter, decision);
        if (!decision.allowed()) {
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(decision.resetSeconds()));
            throw new RateLimitException(ErrorCode.RATE_LIMITED, MESSAGE,
                    Map.of("retryAfterSeconds", limiter.windowSeconds()));
        }
        chain.doFilter(request, response);
    }
}
