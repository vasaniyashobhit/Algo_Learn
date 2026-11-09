package com.algolearn.common.error;

import org.springframework.http.HttpStatus;

/** 502 by default (bad upstream response); use 503 when the service is unavailable or timed out. */
public class ExternalServiceException extends AppException {

    private static final long serialVersionUID = 1L;

    public ExternalServiceException(ErrorCode code) {
        this(code, "An external service failed", null, HttpStatus.BAD_GATEWAY, null);
    }

    public ExternalServiceException(ErrorCode code, String message, Throwable cause) {
        this(code, message, null, HttpStatus.BAD_GATEWAY, cause);
    }

    public ExternalServiceException(ErrorCode code, String message, Object details, HttpStatus status,
            Throwable cause) {
        super(status, code, message, details, cause);
    }
}
