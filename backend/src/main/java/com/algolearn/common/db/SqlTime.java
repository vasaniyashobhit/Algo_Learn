package com.algolearn.common.db;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

/** Instant ⇄ JDBC conversions for timestamptz columns (UTC, independent of the JVM time zone). */
public final class SqlTime {

    private SqlTime() {
    }

    /** A bind value for a timestamptz parameter; null stays null. */
    public static OffsetDateTime of(Instant instant) {
        return instant == null ? null : OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
    }

    public static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
