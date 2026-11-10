package com.algolearn.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.RateLimitException;
import com.algolearn.security.AuthUser;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

/** Legacy stuck.rateLimit.routes.test.js: per user, failed requests count, read routes untouched. */
class StuckRateLimitFilterTest {

    private final StuckRateLimitFilter filter = new StuckRateLimitFilter(2, Duration.ofSeconds(60));

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private static void signIn(UUID id) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new AuthUser(id, "a@b.c"), null, List.of()));
    }

    private MockHttpServletResponse call(String method, String path) throws Exception {
        var response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest(method, path), response, new MockFilterChain());
        return response;
    }

    @Test
    void defaultsTo10PerHour() {
        var defaults = new StuckRateLimitFilter(10, Duration.ofHours(1));
        assertThat(defaults).isNotNull();
        assertThat(new RateLimiter(10, Duration.ofHours(1)).windowSeconds()).isEqualTo(3600);
    }

    @Test
    void limitsEachUserSeparatelyAndLeavesOtherRoutesAlone() throws Exception {
        var first = UUID.randomUUID();
        signIn(first);
        assertThat(call("POST", "/api/v1/stuck").getHeader(RateLimitHeaders.POLICY)).isEqualTo("2;w=60");
        call("POST", "/api/v1/stuck");
        var error = catchThrowableOfType(RateLimitException.class, () -> call("POST", "/api/v1/stuck"));
        assertThat(error.code()).isEqualTo(ErrorCode.RATE_LIMITED);
        assertThat(error.details()).isEqualTo(Map.of("retryAfterSeconds", 60L));
        assertThat(call("GET", "/api/v1/stuck/history").getHeader(RateLimitHeaders.POLICY)).isNull();
        signIn(UUID.randomUUID());
        assertThat(call("POST", "/api/v1/stuck").getStatus()).isEqualTo(200);
    }

    @Test
    void passesAnonymousRequestsToSecurity() throws Exception {
        assertThat(call("POST", "/api/v1/stuck").getHeader(RateLimitHeaders.POLICY)).isNull();
    }
}
