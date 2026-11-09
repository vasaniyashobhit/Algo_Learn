package com.algolearn.users.dto;

import com.algolearn.common.web.IsoTime;
import com.algolearn.users.User;
import java.time.Instant;

/**
 * The user as clients see it (legacy toPublicUser): an explicit whitelist, so the password hash and
 * internal sync fields (syncLockedUntil, lastSubmissionId) can never leak. Same key order as legacy.
 */
public record PublicUser(
        String id,
        String email,
        String name,
        Integer cfRating,
        Integer cfMaxRating,
        String lastSyncedAt,
        String createdAt,
        String updatedAt,
        String cfHandle) {

    public static PublicUser of(User user) {
        return new PublicUser(String.valueOf(user.getId()), user.getEmail(), user.getName(), user.getCfRating(),
                user.getCfMaxRating(), iso(user.getLastSyncedAt()), iso(user.getCreatedAt()),
                iso(user.getUpdatedAt()), user.getCfHandle());
    }

    private static String iso(Instant instant) {
        return instant == null ? null : IsoTime.format(instant);
    }
}
