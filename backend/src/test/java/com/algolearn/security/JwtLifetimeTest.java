package com.algolearn.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

/** JWT_EXPIRES_IN like the ms package used by jsonwebtoken. */
class JwtLifetimeTest {

    @ParameterizedTest
    @CsvSource({"7d, 604800", "2h, 7200", "1h, 3600", "90m, 5400", "1s, 1", "2 days, 172800", "1.5h, 5400",
        "1w, 604800", "1y, 31557600", "1500, 1", "999ms, 0", "10 Seconds, 10", "3 hrs, 10800"})
    void parsesTimespans(String value, long seconds) {
        assertThat(JwtLifetime.parse(value)).isEqualTo(Duration.ofSeconds(seconds));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "seven days", "7 fortnights", " 7d", "7d "})
    void rejectsAnythingElse(String value) {
        assertThatThrownBy(() -> JwtLifetime.parse(value)).isInstanceOf(IllegalArgumentException.class)
                .hasMessageStartingWith("JWT_EXPIRES_IN must be a timespan");
    }
}
