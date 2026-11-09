package com.algolearn.common.error;

import org.springframework.http.HttpStatus;

/** 429: too many requests; details hold retryAfterSeconds. */
public class RateLimitException extends AppException {

    private static final long serialVersionUID = 1L;

    public RateLimitException() {
        this(ErrorCode.RATE_LIMITED, "Too many requests");
    }

    public RateLimitException(ErrorCode code, String message) {
        this(code, message, null, null);
    }

    public RateLimitException(ErrorCode code, String message, Object details) {
        this(code, message, details, null);
    }

    public RateLimitException(ErrorCode code, String message, Object details, Throwable cause) {
        super(HttpStatus.TOO_MANY_REQUESTS, code, message, details, cause);
    }
}
