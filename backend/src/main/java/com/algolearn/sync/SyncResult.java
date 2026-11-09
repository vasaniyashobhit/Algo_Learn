package com.algolearn.sync;

import java.util.List;

/** POST /users/me/sync data (same fields and order as legacy). */
public record SyncResult(int newSubmissions, long totalSubmissions, String lastSyncedAt, List<PendingRef> pending) {

    public SyncResult {
        pending = List.copyOf(pending);
    }
}
