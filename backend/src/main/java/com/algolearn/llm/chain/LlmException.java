package com.algolearn.llm.chain;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A failed provider call (legacy LlmError). Never leaves the LLM module: the chain catches it and tries the
 * next provider. {@code status} is the HTTP status (null if none); {@code reason} is e.g. {@code invalid_json}.
 */
public class LlmException extends RuntimeException {

    public static final String TIMEOUT = "timeout";

    private final Integer status;
    private final String reason;

    public LlmException(String message, Integer status, String reason, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.reason = reason;
    }

    public LlmException(String message) {
        this(message, null, null, null);
    }

    public static LlmException http(String who, int status, Throwable cause) {
        return new LlmException("%s answered HTTP %d".formatted(who, status), status, null, cause);
    }

    /** What {@link TimeLimiter} throws (legacy TimeoutError "Timed out after <ms>ms"). */
    public static LlmException timeout(long ms) {
        return new LlmException("Timed out after %dms".formatted(ms), null, TIMEOUT, null);
    }

    public Integer status() {
        return status;
    }

    public String reason() {
        return reason;
    }

    public boolean isTimeout() {
        return TIMEOUT.equals(reason);
    }

    /** Short, secret-free description for warn logs (legacy describeLlmError). */
    public static Map<String, Object> describe(Throwable error) {
        var out = new LinkedHashMap<String, Object>();
        out.put("name", error == null ? null : error.getClass().getSimpleName());
        out.put("status", error instanceof LlmException e ? e.status : null);
        out.put("reason", error instanceof LlmException e ? e.reason : null);
        var message = error == null ? "null" : String.valueOf(error.getMessage());
        out.put("message", message.length() > 200 ? message.substring(0, 200) : message);
        return out;
    }
}
