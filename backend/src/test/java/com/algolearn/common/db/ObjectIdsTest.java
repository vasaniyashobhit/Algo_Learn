package com.algolearn.common.db;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Random;
import org.junit.jupiter.api.Test;

class ObjectIdsTest {

    private static final Clock AT = Clock.fixed(Instant.ofEpochSecond(0x6720f0c2L), ZoneOffset.UTC);

    @Test
    void startsWithTheSecondsInHexThenSixteenRandomHexDigits() {
        var id = ObjectIds.next(AT, new Random(1));
        assertThat(id).hasSize(24).matches("[0-9a-f]{24}").startsWith("6720f0c2");
        assertThat(ObjectIds.next(AT, new Random(1))).isEqualTo(id);
    }

    @Test
    void padsEarlySecondsAndDiffersBetweenCalls() {
        assertThat(ObjectIds.next(Clock.fixed(Instant.ofEpochSecond(15), ZoneOffset.UTC))).startsWith("0000000f");
        var ids = new HashSet<String>();
        for (var i = 0; i < 1_000; i++) {
            ids.add(ObjectIds.next(AT));
        }
        assertThat(ids).hasSize(1_000);
    }

    @Test
    void parsesTwentyFourHexDigitsInAnyCaseOnly() {
        assertThat(ObjectIds.parse("6720F0C2A1B2C3D4E5F60718")).contains("6720f0c2a1b2c3d4e5f60718");
        assertThat(ObjectIds.parse("6720f0c2a1b2c3d4e5f60718")).contains("6720f0c2a1b2c3d4e5f60718");
        assertThat(ObjectIds.parse("6720f0c2a1b2c3d4e5f6071")).isEmpty();
        assertThat(ObjectIds.parse("6720f0c2a1b2c3d4e5f6071g")).isEmpty();
        assertThat(ObjectIds.parse("ffffffff-ffff-ffff-ffff-ffffffffffff")).isEmpty();
        assertThat(ObjectIds.parse(null)).isEmpty();
    }
}
