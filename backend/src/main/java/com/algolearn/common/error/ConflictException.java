package com.algolearn.common.error;

import org.springframework.http.HttpStatus;

/** 409: the resource already exists or is busy. */
public class ConflictException extends AppException {

    private static final long serialVersionUID = 1L;

    public ConflictException() {
        this(ErrorCode.DUPLICATE_RESOURCE, "Resource already exists");
    }

    public ConflictException(ErrorCode code, String message) {
        this(code, message, null, null);
    }

    public ConflictException(ErrorCode code, String message, Object details) {
        this(code, message, details, null);
    }

    public ConflictException(ErrorCode code, String message, Object details, Throwable cause) {
        super(HttpStatus.CONFLICT, code, message, details, cause);
    }
}
