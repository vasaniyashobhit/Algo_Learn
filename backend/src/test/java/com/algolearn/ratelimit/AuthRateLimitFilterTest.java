package com.algolearn.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.RateLimitException;
import java.time.Duration;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Legacy auth.rateLimit.test.js (default 20 / 15 min, shared counter, only signup and login). */
class AuthRateLimitFilterTest {

    private static MockHttpServletRequest request(String method, String path) {
        var request = new MockHttpServletRequest(method, path);
        request.setRemoteAddr("10.0.0.1");
        return request;
    }

    private static int run(AuthRateLimitFilter filter, MockHttpServletRequest request) throws Exception {
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response.getStatus();
    }

    @Test
    void allows20LoginAttemptsPerIpThenAnswers429WithTheWindow() throws Exception {
        var filter = new AuthRateLimitFilter(20, Duration.ofMinutes(15));
        for (var i = 0; i < 20; i++) {
            assertThat(run(filter, request("POST", "/api/v1/auth/login"))).isEqualTo(200);
        }
        var error = catchThrowableOfType(RateLimitException.class,
                () -> run(filter, request("POST", "/api/v1/auth/login")));
        assertThat(error.code().name()).isEqualTo("RATE_LIMITED");
        assertThat(error.getMessage()).isEqualTo("Too many requests, please slow down");
        assertThat(error.details()).isEqualTo(Map.of("retryAfterSeconds", 900L));
    }

    @Test
    void sharesOneCounterBetweenSignupAndLogin() throws Exception {
        var filter = new AuthRateLimitFilter(2, Duration.ofMinutes(1));
        run(filter, request("POST", "/api/v1/auth/signup"));
        run(filter, request("POST", "/api/v1/auth/login"));
        catchThrowableOfType(RateLimitException.class, () -> run(filter, request("POST", "/api/v1/auth/signup")));
        var other = request("POST", "/api/v1/auth/login");
        other.setRemoteAddr("10.0.0.2");
        assertThat(run(filter, other)).isEqualTo(200);
    }

    @Test
    void writesItsOwnRateLimitHeaders() throws Exception {
        var filter = new AuthRateLimitFilter(20, Duration.ofMinutes(15));
        var response = new MockHttpServletResponse();
        filter.doFilter(request("POST", "/api/v1/auth/signup"), response, new MockFilterChain());
        assertThat(response.getHeader("RateLimit-Policy")).isEqualTo("20;w=900");
        assertThat(response.getHeader("RateLimit")).startsWith("limit=20, remaining=19, reset=");
    }

    @Test
    void leavesGetAuthMeAndEveryOtherRouteAlone() {
        var filter = new AuthRateLimitFilter(1, Duration.ofMinutes(1));
        assertThat(filter.shouldNotFilter(request("GET", "/api/v1/auth/me"))).isTrue();
        assertThat(filter.shouldNotFilter(request("GET", "/api/v1/auth/login"))).isTrue();
        assertThat(filter.shouldNotFilter(request("GET", "/api/v1/health"))).isTrue();
        assertThat(filter.shouldNotFilter(request("POST", "/api/v1/auth/login"))).isFalse();
    }
}
