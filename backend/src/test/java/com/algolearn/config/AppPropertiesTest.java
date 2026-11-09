package com.algolearn.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.support.TestProperties;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class AppPropertiesTest {

    @Test
    void toStringNeverContainsSecrets() {
        var props = TestProperties.app(false);
        assertThat(props.toString()).contains("port=4000", "http://localhost:5173")
                .doesNotContain(props.jwtSecret(), props.cronSecret(), props.geminiApiKey());
    }

    @Test
    void modelListIsImmutable() {
        assertThat(TestProperties.app(false).geminiModels()).isUnmodifiable();
    }

    @Test
    void configProvidesAUtcClockAndValidatedProperties() {
        var config = new AppConfig();
        assertThat(config.clock().getZone()).isEqualTo(ZoneOffset.UTC);
        var env = new MockEnvironment();
        TestProperties.env().forEach(env::setProperty);
        assertThat(config.appProperties(env).port()).isEqualTo(4000);
    }
}
