package com.algolearn.common.error;

import com.fasterxml.jackson.annotation.JsonInclude;

/** {@code { "success": false, "error": { code, message, details, requestId, stack? } }}. */
public record ErrorResponse(boolean success, Body error) {

    public static ErrorResponse of(ErrorCode code, String message, Object details, String requestId, String stack) {
        return new ErrorResponse(false, new Body(code.name(), message, details, requestId, stack));
    }

    /** {@code details} and {@code requestId} are always present (maybe null); {@code stack} only outside prod. */
    public record Body(
            String code,
            String message,
            @JsonInclude(JsonInclude.Include.ALWAYS) Object details,
            @JsonInclude(JsonInclude.Include.ALWAYS) String requestId,
            @JsonInclude(JsonInclude.Include.NON_NULL) String stack) {
    }
}
