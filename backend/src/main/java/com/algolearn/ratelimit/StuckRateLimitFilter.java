package com.algolearn.ratelimit;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.RateLimitException;
import com.algolearn.security.AuthUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * POST /stuck: 10 per hour per user (legacy userKey limiter), on top of the IP limit. Runs after Spring Security
 * (so the user is known) and before the DispatcherServlet reads the upload; failed requests count too.
 */
@Component
@Order(0)
public class StuckRateLimitFilter extends OncePerRequestFilter {

    static final String PATH = "/api/v1/stuck";

    private final RateLimiter limiter;

    public StuckRateLimitFilter(
            @Value("${algolearn.rate-limit.stuck.limit:10}") long limit,
            @Value("${algolearn.rate-limit.stuck.window:1h}") Duration window) {
        this.limiter = new RateLimiter(limit, window);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("POST".equals(request.getMethod()) && PATH.equals(request.getRequestURI()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthUser user)) {
            chain.doFilter(request, response);
            return;
        }
        var decision = limiter.tryConsume("user:" + user.id());
        RateLimitHeaders.write(response, limiter, decision);
        if (!decision.allowed()) {
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(decision.resetSeconds()));
            throw new RateLimitException(ErrorCode.RATE_LIMITED, GlobalRateLimitFilter.MESSAGE,
                    Map.of("retryAfterSeconds", limiter.windowSeconds()));
        }
        chain.doFilter(request, response);
    }
}
