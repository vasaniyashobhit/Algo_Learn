package com.algolearn.stats;

import java.time.Instant;
import java.util.Optional;

/** Why a user's stats are empty on purpose (legacy emptyReason): no handle, or linked but never synced. */
public final class EmptyReason {

    private EmptyReason() {
    }

    public static Optional<String> of(String cfHandle, Instant lastSyncedAt) {
        if (cfHandle == null || cfHandle.isEmpty()) {
            return Optional.of(StatsConstants.REASON_NO_HANDLE);
        }
        return lastSyncedAt == null ? Optional.of(StatsConstants.REASON_NOT_SYNCED) : Optional.empty();
    }
}
