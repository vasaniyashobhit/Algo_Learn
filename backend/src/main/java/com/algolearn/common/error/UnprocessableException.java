package com.algolearn.common.error;

import org.springframework.http.HttpStatus;

/** 422: the input was received but could not be turned into anything usable. */
public class UnprocessableException extends AppException {

    private static final long serialVersionUID = 1L;

    public UnprocessableException() {
        this(ErrorCode.INPUT_UNREADABLE, "The input could not be read");
    }

    public UnprocessableException(ErrorCode code, String message) {
        this(code, message, null, null);
    }

    public UnprocessableException(ErrorCode code, String message, Object details) {
        this(code, message, details, null);
    }

    public UnprocessableException(ErrorCode code, String message, Object details, Throwable cause) {
        super(HttpStatus.UNPROCESSABLE_CONTENT, code, message, details, cause);
    }
}
