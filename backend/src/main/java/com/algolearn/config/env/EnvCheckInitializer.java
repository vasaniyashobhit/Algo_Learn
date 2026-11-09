package com.algolearn.config.env;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Profiles;

/**
 * Fails fast before any bean is created (so a missing DATABASE_URL is reported here, not as a
 * DataSource error). Runs after every property source, including backend/.env, is loaded.
 */
public class EnvCheckInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        var env = context.getEnvironment();
        EnvValidator.parse(env::getProperty, env.acceptsProfiles(Profiles.of("prod")));
    }
}
