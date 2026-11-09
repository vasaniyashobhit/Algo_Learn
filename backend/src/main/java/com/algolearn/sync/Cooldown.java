package com.algolearn.sync;

import java.time.Instant;

/** The per-user sync cooldown (legacy helpers/cooldown.js). */
public final class Cooldown {

    private Cooldown() {
    }

    /** Milliseconds left before {@code lastSyncedAt + cooldownMs}; 0 when never synced or it is over. */
    public static long leftMs(Instant lastSyncedAt, Instant now, long cooldownMs) {
        if (lastSyncedAt == null || cooldownMs <= 0) {
            return 0;
        }
        return Math.max(0, lastSyncedAt.toEpochMilli() + cooldownMs - now.toEpochMilli());
    }
}
