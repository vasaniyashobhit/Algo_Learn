package com.algolearn.sync;

/**
 * Submission sync settings (legacy SYNC): lock length, Codeforces page size, the page cap (also the
 * first-sync limit) and the per-user cooldown after lastSyncedAt (user-triggered syncs only).
 */
public record SyncSettings(long lockMs, int pageSize, int maxPages, long cooldownMs) {

    public static final SyncSettings DEFAULT = new SyncSettings(5 * 60_000L, 500, 20, 20_000L);

    /** Weekly problemset refresh: Sundays at 03:00 server time (legacy {@code 0 3 * * 0}). */
    public static final String PROBLEMSET_SYNC_CRON = "0 0 3 * * SUN";
}
