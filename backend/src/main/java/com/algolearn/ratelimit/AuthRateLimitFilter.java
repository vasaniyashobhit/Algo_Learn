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
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * POST /auth/signup and POST /auth/login share one stricter per-IP counter (20 per 15 minutes by
 * default) on top of the global limit; GET /auth/me is not counted. Runs after the global filter,
 * so its RateLimit headers are the ones the client sees (as with the legacy route limiter).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 7)
public class AuthRateLimitFilter extends OncePerRequestFilter {

    static final Set<String> PATHS = Set.of("/api/v1/auth/signup", "/api/v1/auth/login");

    private final RateLimiter limiter;

    public AuthRateLimitFilter(
            @Value("${algolearn.rate-limit.auth.limit:20}") long limit,
            @Value("${algolearn.rate-limit.auth.window:15m}") Duration window) {
        this.limiter = new RateLimiter(limit, window);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("POST".equals(request.getMethod()) && PATHS.contains(request.getRequestURI()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var decision = limiter.tryConsume("ip:" + request.getRemoteAddr());
        RateLimitHeaders.write(response, limiter, decision);
        if (!decision.allowed()) {
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(decision.resetSeconds()));
            throw new RateLimitException(ErrorCode.RATE_LIMITED, GlobalRateLimitFilter.MESSAGE,
                    Map.of("retryAfterSeconds", limiter.windowSeconds()));
        }
        chain.doFilter(request, response);
    }
}
