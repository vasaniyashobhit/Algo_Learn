package com.algolearn.support;

import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/** One PostgreSQL container for the whole test run (same image as docker-compose). */
public final class SharedPostgres {

    public static final PostgreSQLContainer INSTANCE = start();

    private SharedPostgres() {
    }

    private static PostgreSQLContainer start() {
        var image = DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres");
        var container = new PostgreSQLContainer(image).withDatabaseName("algolearn");
        container.start();
        return container;
    }
}
