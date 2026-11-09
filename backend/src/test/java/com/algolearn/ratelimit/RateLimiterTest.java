package com.algolearn.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimiterTest {

    @Test
    void allowsUpToTheLimitPerKeyThenRejects() {
        var limiter = new RateLimiter(2, Duration.ofMinutes(1));
        var first = limiter.tryConsume("a");
        assertThat(first.allowed()).isTrue();
        assertThat(first.remaining()).isEqualTo(1);
        assertThat(first.resetSeconds()).isBetween(1L, 60L);
        assertThat(limiter.tryConsume("a").allowed()).isTrue();
        var third = limiter.tryConsume("a");
        assertThat(third.allowed()).isFalse();
        assertThat(third.remaining()).isZero();
        assertThat(third.resetSeconds()).isBetween(1L, 60L);
        assertThat(limiter.tryConsume("b").allowed()).isTrue();
    }

    @Test
    void usesTheLegacyDefaultsThroughTheFilterAndExposesWindowSeconds() {
        var limiter = new RateLimiter(300, Duration.ofMinutes(15));
        assertThat(limiter.limit()).isEqualTo(300);
        assertThat(limiter.windowSeconds()).isEqualTo(900);
    }

    @Test
    void sweepsIdleFullBucketsWithoutLosingActiveOnes() {
        var limiter = new RateLimiter(5, Duration.ofMinutes(1));
        for (var i = 0; i < 1_000; i++) {
            assertThat(limiter.tryConsume("key-" + i).allowed()).isTrue();
        }
        assertThat(limiter.tryConsume("key-1").remaining()).isEqualTo(3);
    }

    @Test
    void writesDraft7Headers() {
        var limiter = new RateLimiter(300, Duration.ofMinutes(15));
        var response = new MockHttpServletResponse();
        RateLimitHeaders.write(response, limiter, new RateLimiter.Decision(true, 299, 900));
        assertThat(response.getHeader(RateLimitHeaders.POLICY)).isEqualTo("300;w=900");
        assertThat(response.getHeader(RateLimitHeaders.STATE)).isEqualTo("limit=300, remaining=299, reset=900");
    }
}
