package com.algolearn.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Full app (all filters, security, Flyway) on the shared Testcontainers PostgreSQL, driven by MockMvc. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestRoutes.class, TestSecurity.class})
public abstract class IntegrationTest {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = SharedPostgres.INSTANCE;

    protected final MockMvc mvc;

    protected IntegrationTest(MockMvc mvc) {
        this.mvc = mvc;
    }
}
