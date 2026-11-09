package com.algolearn.common.error;

import org.springframework.http.HttpStatus;

/** 400: invalid body, query or params. */
public class ValidationException extends AppException {

    private static final long serialVersionUID = 1L;

    public ValidationException() {
        this(ErrorCode.VALIDATION_FAILED, "Request validation failed");
    }

    public ValidationException(ErrorCode code, String message) {
        this(code, message, null, null);
    }

    public ValidationException(ErrorCode code, String message, Object details) {
        this(code, message, details, null);
    }

    public ValidationException(ErrorCode code, String message, Object details, Throwable cause) {
        super(HttpStatus.BAD_REQUEST, code, message, details, cause);
    }
}
