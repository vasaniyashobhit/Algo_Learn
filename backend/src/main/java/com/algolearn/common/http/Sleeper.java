package com.algolearn.common.http;

/** Waits between retries; tests inject a fake that records the delays instead of sleeping. */
@FunctionalInterface
public interface Sleeper {

    Sleeper REAL = Thread::sleep;

    void sleep(long millis) throws InterruptedException;
}
