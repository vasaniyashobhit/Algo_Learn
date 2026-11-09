package com.algolearn.users.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.support.Json;
import com.algolearn.users.User;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Legacy publicUser.test.js. */
class PublicUserTest {

    @Test
    void keepsThePublicFieldsInOrderWithIsoDates() {
        var user = new User();
        var id = UUID.randomUUID();
        var at = Instant.parse("2026-01-01T00:00:00.123456Z");
        user.setId(id);
        user.setEmail("a@b.co");
        user.setName("Ada");
        user.setCfHandle("tourist");
        user.setCfRating(3500);
        user.setCfMaxRating(3800);
        user.setLastSyncedAt(at);
        user.setCreatedAt(at);
        user.setUpdatedAt(at);
        user.setPasswordHash("$2b$12$x");
        user.setSyncLockedUntil(at);
        user.setLastSubmissionId(7L);
        var json = Json.MAPPER.writeValueAsString(PublicUser.of(user));
        assertThat(json).isEqualTo(("{\"id\":\"%s\",\"email\":\"a@b.co\",\"name\":\"Ada\",\"cfRating\":3500,"
                + "\"cfMaxRating\":3800,\"lastSyncedAt\":\"2026-01-01T00:00:00.123Z\","
                + "\"createdAt\":\"2026-01-01T00:00:00.123Z\",\"updatedAt\":\"2026-01-01T00:00:00.123Z\","
                + "\"cfHandle\":\"tourist\"}").formatted(id));
    }

    @Test
    void fillsMissingOptionalFieldsWithNullAndNeverLeaksSecrets() {
        var user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("a@b.co");
        var json = Json.MAPPER.readTree(Json.MAPPER.writeValueAsString(PublicUser.of(user)));
        for (var field : new String[] {"cfHandle", "cfRating", "lastSyncedAt", "createdAt"}) {
            assertThat(json.get(field).isNull()).as(field).isTrue();
        }
        for (var field : new String[] {"passwordHash", "syncLockedUntil", "lastSubmissionId"}) {
            assertThat(json.has(field)).as(field).isFalse();
        }
    }
}
