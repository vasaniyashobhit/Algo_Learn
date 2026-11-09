package com.algolearn.common.web;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/** ISO-8601 UTC with exactly three fraction digits, like JavaScript's Date#toISOString(). */
public final class IsoTime {

    private static final DateTimeFormatter FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

    private IsoTime() {
    }

    public static String format(Instant instant) {
        return FORMAT.format(instant);
    }
}
