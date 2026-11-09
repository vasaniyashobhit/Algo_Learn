package com.algolearn.tasks;

/** A one-off command run with {@code --task=<name>}; the app prints its summary and exits. */
public interface Task {

    /** The {@code --task} value, e.g. {@code import-dataset}. */
    String name();

    /** Does the work and returns the summary (printed as JSON). */
    Object run();
}
