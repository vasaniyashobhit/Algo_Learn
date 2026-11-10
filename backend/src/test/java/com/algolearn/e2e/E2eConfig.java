package com.algolearn.e2e;

import com.algolearn.codeforces.CodeforcesClient;
import com.algolearn.common.error.ErrorResponseWriter;
import com.algolearn.importer.ProblemWriter;
import com.algolearn.llm.Llm;
import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.stuck.input.OcrEngine;
import java.time.Clock;
import java.util.List;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.json.JsonMapper;

/**
 * The {@code e2e} profile's beans (legacy e2e server): a fresh PostgreSQL container, the seeded problems, and fakes
 * for everything external. Nothing real (Codeforces, Gemini, Groq, OCR) is ever called.
 */
@Configuration(proxyBeanMethods = false)
@Profile("e2e")
public class E2eConfig {

    public E2eConfig() {
        if (!E2eApplication.isEnabled(System.getenv(E2eApplication.FLAG))) {
            throw new IllegalStateException("The e2e profile needs E2E=1");
        }
    }

    @Bean
    @ServiceConnection
    PostgreSQLContainer e2ePostgres() {
        var image = DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres");
        return new PostgreSQLContainer(image).withDatabaseName("algolearn-e2e");
    }

    @Bean
    @Primary
    CodeforcesClient e2eCodeforces(Clock clock) {
        return new E2eCodeforces(clock);
    }

    /** The real coach chain (budget, breaker, schema check, sanitizer) around the fake provider. */
    @Bean
    @Primary
    Llm e2eLlm(ChainSettings llmChainSettings) {
        return new Llm(List.of(new E2eCoach()), new E2eCoach.MemoryCache(), llmChainSettings);
    }

    /** OCR finds no text (legacy noOcr). */
    @Bean
    @Primary
    OcrEngine e2eOcr() {
        return image -> "";
    }

    /** /health stays 503 until the JVM is warmed up (see {@link E2eWarmup}). */
    @Bean
    E2eReadiness e2eReadiness(ErrorResponseWriter writer, JsonMapper json) {
        return new E2eReadiness(writer, json);
    }

    /** Seeds the problems once singletons exist (Flyway has run) and before the web server opens its port. */
    @Bean
    SmartInitializingSingleton e2eSeed(JdbcTemplate jdbc, Clock clock) {
        return () -> new ProblemWriter(jdbc, clock).upsert(E2eProblems.docs(), ProblemWriter.Mode.OVERWRITE,
                ProblemWriter.BATCH_SIZE, batch -> { });
    }
}
