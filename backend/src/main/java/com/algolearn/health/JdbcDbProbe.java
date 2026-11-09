package com.algolearn.health;

import java.sql.SQLException;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Borrows a pooled connection and validates it; any failure means "down" (logged at warn). */
@Component
public class JdbcDbProbe implements DbProbe {

    static final int VALID_TIMEOUT_SECONDS = 2;
    private static final Logger LOG = LoggerFactory.getLogger(JdbcDbProbe.class);

    private final DataSource dataSource;

    public JdbcDbProbe(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public String state() {
        try (var connection = dataSource.getConnection()) {
            return connection.isValid(VALID_TIMEOUT_SECONDS) ? "up" : "down";
        } catch (SQLException e) {
            LOG.warn("Database health check failed: {}", e.getMessage());
            return "down";
        }
    }
}
