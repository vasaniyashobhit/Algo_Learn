package com.algolearn.config.env;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.support.TestProperties;
import org.junit.jupiter.api.Test;

/** Legacy env.cron.test.js: SYNC_CRON is checked at startup, so an invalid expression never boots. */
class SyncCronTest {

    @Test
    void acceptsAValidCronExpression() {
        var env = TestProperties.env();
        env.put("SYNC_CRON", "*/30 * * * *");
        assertThat(EnvValidator.parse(env::get, false).syncCron()).isEqualTo("*/30 * * * *");
    }

    @Test
    void defaultsToEverySixHours() {
        assertThat(EnvValidator.parse(TestProperties.env()::get, false).syncCron()).isEqualTo("0 */6 * * *");
    }

    @Test
    void rejectsAnInvalidCronExpressionAtStartup() {
        var env = TestProperties.env();
        env.put("SYNC_CRON", "every six hours");
        assertThatThrownBy(() -> EnvValidator.parse(env::get, false))
                .hasMessageContaining("SYNC_CRON: Must be a valid cron expression");
    }
}
