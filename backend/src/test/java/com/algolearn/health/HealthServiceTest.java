package com.algolearn.health;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class HealthServiceTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-28T16:41:50Z"), ZoneOffset.UTC);

    @Test
    void snapshotHasStatusDbUptimeAndMillisecondIsoTime() {
        var snapshot = new HealthService(() -> "up", clock).health();
        assertThat(snapshot.status()).isEqualTo("ok");
        assertThat(snapshot.db()).isEqualTo("up");
        assertThat(snapshot.uptime()).isPositive();
        assertThat(snapshot.time()).isEqualTo("2026-10-28T16:41:50.000Z");
    }

    @Test
    void isDegradedWhileTheDatabaseIsDownAndNotReady() {
        var service = new HealthService(() -> "down", clock);
        assertThat(service.health().status()).isEqualTo("degraded");
        assertThatThrownBy(service::ready).isInstanceOfSatisfying(ExternalServiceException.class, e -> {
            assertThat(e.status().value()).isEqualTo(503);
            assertThat(e.code()).isEqualTo(ErrorCode.DB_UNAVAILABLE);
        });
        assertThat(new HealthService(() -> "up", clock).ready().db()).isEqualTo("up");
    }

    @Test
    void jdbcProbeReadsTheConnectionState() throws SQLException {
        var dataSource = mock(DataSource.class);
        var connection = mock(Connection.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(JdbcDbProbe.VALID_TIMEOUT_SECONDS)).thenReturn(true, false);
        var probe = new JdbcDbProbe(dataSource);
        assertThat(probe.state()).isEqualTo("up");
        assertThat(probe.state()).isEqualTo("down");
    }

    @Test
    void jdbcProbeReportsDownWhenNoConnectionCanBeOpened() throws SQLException {
        var dataSource = mock(DataSource.class);
        when(dataSource.getConnection()).thenThrow(new SQLException("Connection refused"));
        assertThat(new JdbcDbProbe(dataSource).state()).isEqualTo("down");
    }
}
