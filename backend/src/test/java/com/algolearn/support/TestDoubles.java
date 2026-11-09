package com.algolearn.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** The integration-test context uses a controllable clock and a fake Codeforces client (never the real API). */
@TestConfiguration(proxyBeanMethods = false)
public class TestDoubles {

    @Bean
    @Primary
    MutableClock testClock() {
        return new MutableClock();
    }

    @Bean
    @Primary
    FakeCodeforcesClient fakeCodeforcesClient() {
        return new FakeCodeforcesClient();
    }
}
