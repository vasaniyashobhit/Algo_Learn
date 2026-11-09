package com.algolearn.common.http;

import java.util.ArrayList;
import java.util.List;

/** A fake clock whose sleep advances time instantly and records each wait (legacy fakeClock). */
final class FakeClock {

    long time = 1_000;
    final List<Long> waits = new ArrayList<>();

    RateLimitQueue queue(long intervalMs) {
        return new RateLimitQueue(intervalMs, () -> time, ms -> {
            waits.add(ms);
            time += ms;
        });
    }
}
