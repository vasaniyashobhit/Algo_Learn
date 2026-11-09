package com.algolearn.common.error;

import org.springframework.http.HttpStatus;

/** 404: a missing resource or route. */
public class NotFoundException extends AppException {

    private static final long serialVersionUID = 1L;

    public NotFoundException() {
        this(ErrorCode.NOT_FOUND, "Resource not found");
    }

    public NotFoundException(ErrorCode code, String message) {
        this(code, message, null, null);
    }

    public NotFoundException(ErrorCode code, String message, Object details) {
        this(code, message, details, null);
    }

    public NotFoundException(ErrorCode code, String message, Object details, Throwable cause) {
        super(HttpStatus.NOT_FOUND, code, message, details, cause);
    }
}
