package com.algolearn.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;

/** The test-only {@link TestRoutes} are outside the app's public list; security skips them in tests. */
@TestConfiguration(proxyBeanMethods = false)
public class TestSecurity {

    @Bean
    WebSecurityCustomizer openTestRoutes() {
        return web -> web.ignoring().requestMatchers("/api/v1/__test/**");
    }
}
