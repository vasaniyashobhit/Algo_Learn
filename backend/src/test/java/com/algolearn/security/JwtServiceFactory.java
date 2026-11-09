package com.algolearn.security;

import com.algolearn.config.AppProperties;
import com.algolearn.support.TestProperties;
import java.time.Clock;
import java.time.Duration;
import tools.jackson.databind.json.JsonMapper;

/** Builds a {@link JwtService} with any secret, lifetime and clock (legacy createTokenService in tests). */
public final class JwtServiceFactory {

    private JwtServiceFactory() {
    }

    public static JwtService create(String secret, Duration lifetime, Clock clock) {
        var base = TestProperties.app(false);
        var settings = new AppProperties(base.port(), secret, lifetime.toSeconds() + "s", base.clientUrl(),
                base.geminiApiKey(), base.geminiModels(), base.groqApiKey(), base.groqModel(), base.cronSecret(),
                base.syncCron(), base.logLevel(), base.production());
        return new JwtService(settings, JsonMapper.builder().build(), clock);
    }
}
