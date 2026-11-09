package com.algolearn.config;

import com.algolearn.config.env.EnvValidator;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

/** Core beans: the validated settings and the clock all time-based logic uses. */
@Configuration(proxyBeanMethods = false)
public class AppConfig {

    @Bean
    AppProperties appProperties(Environment env) {
        return EnvValidator.parse(env::getProperty, env.acceptsProfiles(Profiles.of("prod")));
    }

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
