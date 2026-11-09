package com.algolearn.config.env;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.support.TestProperties;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.mock.env.MockEnvironment;

class EnvStartupTest {

    private static GenericApplicationContext contextWith(MockEnvironment env) {
        var context = new GenericApplicationContext();
        context.setEnvironment(env);
        return context;
    }

    @Test
    void initializerPassesAValidEnvironment() {
        var env = new MockEnvironment();
        TestProperties.env().forEach(env::setProperty);
        env.setActiveProfiles("prod");
        assertThatCode(() -> new EnvCheckInitializer().initialize(contextWith(env))).doesNotThrowAnyException();
    }

    @Test
    void initializerFailsBeforeAnyBeanIsCreated() {
        var context = contextWith(new MockEnvironment());
        assertThatThrownBy(() -> new EnvCheckInitializer().initialize(context))
                .isInstanceOf(EnvValidationException.class)
                .hasMessageContaining("DATABASE_URL: missing")
                .hasMessageContaining("JWT_SECRET: missing");
    }

    @Test
    void failureAnalyzerReportsTheIssuesAndTheFix() {
        var error = new EnvValidationException(List.of("JWT_SECRET: missing"));
        var analysis = new EnvFailureAnalyzer().analyze(error, error);
        assertThat(analysis.getDescription()).contains("JWT_SECRET: missing");
        assertThat(analysis.getAction()).contains("backend/.env.example");
    }
}
