package com.algolearn.common.error;

import org.springframework.http.HttpStatus;

/** 401: missing, invalid or expired credentials. */
public class AuthException extends AppException {

    private static final long serialVersionUID = 1L;

    public AuthException() {
        this(ErrorCode.AUTH_REQUIRED, "Authentication required");
    }

    public AuthException(ErrorCode code, String message) {
        this(code, message, null, null);
    }

    public AuthException(ErrorCode code, String message, Object details) {
        this(code, message, details, null);
    }

    public AuthException(ErrorCode code, String message, Object details, Throwable cause) {
        super(HttpStatus.UNAUTHORIZED, code, message, details, cause);
    }
}
