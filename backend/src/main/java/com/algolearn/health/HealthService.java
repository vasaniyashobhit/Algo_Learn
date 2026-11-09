package com.algolearn.health;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import com.algolearn.common.web.IsoTime;
import java.lang.management.ManagementFactory;
import java.time.Clock;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Liveness and readiness snapshots. */
@Service
public class HealthService {

    private static final double MILLIS_PER_SECOND = 1000.0;

    private final DbProbe db;
    private final Clock clock;

    public HealthService(DbProbe db, Clock clock) {
        this.db = db;
        this.clock = clock;
    }

    /** Liveness: always a snapshot; {@code degraded} while the database is down. */
    public HealthSnapshot health() {
        return snapshot(db.state());
    }

    /** Readiness: 503 DB_UNAVAILABLE until the database answers. */
    public HealthSnapshot ready() {
        var state = db.state();
        if (!"up".equals(state)) {
            throw new ExternalServiceException(ErrorCode.DB_UNAVAILABLE, "Database is not connected", null,
                    HttpStatus.SERVICE_UNAVAILABLE, null);
        }
        return snapshot(state);
    }

    private HealthSnapshot snapshot(String state) {
        var uptime = ManagementFactory.getRuntimeMXBean().getUptime() / MILLIS_PER_SECOND;
        return new HealthSnapshot("up".equals(state) ? "ok" : "degraded", state, uptime,
                IsoTime.format(clock.instant()));
    }
}
