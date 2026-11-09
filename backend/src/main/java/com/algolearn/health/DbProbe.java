package com.algolearn.health;

/** Tells whether the database answers right now. */
public interface DbProbe {

    /** {@code "up"} or {@code "down"}. */
    String state();
}
