package com.algolearn.common.error;

import org.springframework.http.HttpStatus;

/** 413 for FILE_TOO_LARGE, 415 for everything else (unsupported type). */
public class PayloadException extends AppException {

    private static final long serialVersionUID = 1L;

    public PayloadException() {
        this(ErrorCode.FILE_TYPE_UNSUPPORTED, "Unsupported payload");
    }

    public PayloadException(ErrorCode code, String message) {
        this(code, message, null, null);
    }

    public PayloadException(ErrorCode code, String message, Object details) {
        this(code, message, details, null);
    }

    public PayloadException(ErrorCode code, String message, Object details, Throwable cause) {
        super(statusFor(code), code, message, details, cause);
    }

    private static HttpStatus statusFor(ErrorCode code) {
        return code == ErrorCode.FILE_TOO_LARGE ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.UNSUPPORTED_MEDIA_TYPE;
    }
}
