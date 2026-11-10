package com.algolearn.llm.chain;

/** Result of one provider in the chain: a {@code value}, or why it {@code failed} (never both). */
public record CallOutcome<T>(T value, Failed failed) {

    /**
     * {@code OPEN} circuit open (not called), {@code BUSY} minute budget used up, {@code TIMEOUT} the chain's
     * deadline passed (stop the chain), {@code ERROR} anything else.
     */
    public enum Failed {
        OPEN,
        BUSY,
        TIMEOUT,
        ERROR
    }

    public static <T> CallOutcome<T> ok(T value) {
        return new CallOutcome<>(value, null);
    }

    public static <T> CallOutcome<T> failed(Failed failed) {
        return new CallOutcome<>(null, failed);
    }
}
