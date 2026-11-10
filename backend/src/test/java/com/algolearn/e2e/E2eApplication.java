package com.algolearn.e2e;

import com.algolearn.AlgoLearnApplication;
import java.util.List;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringApplicationRunListener;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * The E2E test backend (legacy e2e/server/start.js): the real app with the {@code e2e} profile — a fresh
 * Testcontainers PostgreSQL seeded with the E2E problems, fake Codeforces, fake AI, no OCR. It lives in test
 * sources, so none of it ships in the production jar. Start it with {@code npm run e2e:server} (or
 * {@code mvnw spring-boot:test-run} with {@code E2E=1}); it refuses to start without {@code E2E=1}.
 */
public final class E2eApplication {

    static final String FLAG = "E2E";

    private E2eApplication() {
    }

    public static void main(String[] args) {
        if (!isEnabled(System.getenv(FLAG))) {
            LoggerFactory.getLogger(E2eApplication.class).error("Refusing to start: the E2E test backend needs E2E=1.");
            System.exit(1);
        }
        // backend/.env holds real keys and the dev database: never read it here.
        System.setProperty("springdotenv.enabled", "false");
        SpringApplication.withHook(E2eApplication::configure, () -> AlgoLearnApplication.main(args));
    }

    static boolean isEnabled(String flag) {
        return "1".equals(flag);
    }

    /** Adds the E2E config and profiles, and keeps the other test-source beans out of the component scan. */
    static SpringApplicationRunListener configure(SpringApplication app) {
        app.addPrimarySources(List.of(E2eConfig.class));
        app.setAdditionalProfiles("e2e", "prod");
        app.addInitializers(excludeOtherTestClasses());
        return new SpringApplicationRunListener() {
        };
    }

    static ApplicationContextInitializer<ConfigurableApplicationContext> excludeOtherTestClasses() {
        return context -> context.getBeanFactory().registerSingleton("e2eTestClassExcludeFilter",
                new TestClassExcludeFilter());
    }
}
