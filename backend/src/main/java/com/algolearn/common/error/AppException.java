package com.algolearn.common.error;

import org.springframework.http.HttpStatus;

/** Base class for every error we send to clients on purpose. Subclasses fix the HTTP status. */
public class AppException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final HttpStatus status;
    private final ErrorCode code;
    private final transient Object details;

    public AppException(HttpStatus status, ErrorCode code, String message, Object details, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
        this.details = details;
    }

    public HttpStatus status() {
        return status;
    }

    public ErrorCode code() {
        return code;
    }

    /** {@code null}, a list of {@link FieldIssue}, or an object (see docs/API.md). */
    public Object details() {
        return details;
    }
}
