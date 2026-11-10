package com.algolearn.stuck.url;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import com.algolearn.stuck.url.PageFetcher.FetchFailure;
import java.util.LinkedHashMap;
import org.springframework.http.HttpStatus;

/** The URL_FETCH_FAILED / URL_NOT_ALLOWED errors of the link reader, with ordered {@code details}. */
final class UrlErrors {

    private UrlErrors() {
    }

    /** 502 URL_FETCH_FAILED with {@code details} given as key, value pairs (in order). */
    static ExternalServiceException failed(String message, Throwable cause, Object... pairs) {
        var details = new LinkedHashMap<String, Object>();
        for (var i = 0; i < pairs.length; i += 2) {
            details.put((String) pairs[i], pairs[i + 1]);
        }
        var status = "timeout".equals(details.get("reason")) ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY;
        return new ExternalServiceException(ErrorCode.URL_FETCH_FAILED, message, details, status, cause);
    }

    static ExternalServiceException status(int status, String message) {
        return failed(message, null, "reason", "status", "status", status);
    }

    /** A failed hop: the connect-time refusal stays URL_NOT_ALLOWED (DNS changed after the guard's check). */
    static AppException of(FetchFailure failure, long timeoutMs, int maxBytes) {
        return switch (failure.kind()) {
            case PRIVATE -> UrlGuard.notAllowed("Links to private or local network addresses are not allowed",
                    "private", failure);
            case TOO_LARGE -> failed("The page is too large to read", failure, "reason", "too_large",
                    "maxBytes", maxBytes);
            case TIMEOUT -> failed("Request timed out after " + timeoutMs + "ms", failure, "reason", "timeout",
                    "timeoutMs", timeoutMs);
            case NETWORK -> failed("The page could not be downloaded", failure, "reason", "network");
        };
    }
}
