package com.algolearn.common.error;

import org.springframework.http.HttpStatus;

/** 403: authenticated but not allowed. */
public class ForbiddenException extends AppException {

    private static final long serialVersionUID = 1L;

    public ForbiddenException() {
        this(ErrorCode.FORBIDDEN, "You cannot access this resource");
    }

    public ForbiddenException(ErrorCode code, String message) {
        this(code, message, null, null);
    }

    public ForbiddenException(ErrorCode code, String message, Object details) {
        this(code, message, details, null);
    }

    public ForbiddenException(ErrorCode code, String message, Object details, Throwable cause) {
        super(HttpStatus.FORBIDDEN, code, message, details, cause);
    }
}
