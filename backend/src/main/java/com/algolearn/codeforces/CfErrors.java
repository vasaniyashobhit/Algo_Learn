package com.algolearn.codeforces;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import com.algolearn.common.error.NotFoundException;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;

/** Typed errors for Codeforces answers and the rule for which ones are worth retrying. */
public final class CfErrors {

    private static final Pattern HANDLE_NOT_FOUND = Pattern.compile("handles?:.*not found", Pattern.CASE_INSENSITIVE);
    private static final Pattern CALL_LIMIT = Pattern.compile("call limit exceeded", Pattern.CASE_INSENSITIVE);
    private static final int TOO_MANY_REQUESTS = 429;
    private static final int SERVER_ERROR = 500;

    private CfErrors() {
    }

    /** Maps a {@code "status": "FAILED"} body (its {@code comment}) to a typed error. */
    public static AppException failedStatus(String comment) {
        var text = comment == null ? "" : comment;
        if (HANDLE_NOT_FOUND.matcher(text).find()) {
            return new NotFoundException(ErrorCode.CF_HANDLE_NOT_FOUND, "Codeforces handle not found",
                    Map.of("comment", text));
        }
        if (CALL_LIMIT.matcher(text).find()) {
            return unavailable("Codeforces rate limit reached", details("comment", text, true),
                    HttpStatus.SERVICE_UNAVAILABLE, null);
        }
        return unavailable("Codeforces rejected the request", details("comment", text, false),
                HttpStatus.BAD_GATEWAY, null);
    }

    /** 5xx and 429 are retryable (503); other non-JSON HTTP errors are not (502). */
    public static AppException httpStatus(int status) {
        var retryable = status >= SERVER_ERROR || status == TOO_MANY_REQUESTS;
        return unavailable("Codeforces answered HTTP " + status, details("status", status, retryable),
                retryable ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY, null);
    }

    public static AppException invalidBody(int status, Throwable cause) {
        return unavailable("Codeforces sent an unreadable response", details("status", status, status >= SERVER_ERROR),
                HttpStatus.BAD_GATEWAY, cause);
    }

    /** Retry timeouts, network failures, 5xx/429 and the call-limit FAILED status. */
    public static boolean isRetryable(Throwable error) {
        if (!(error instanceof AppException app) || !(app.details() instanceof Map<?, ?> details)) {
            return false;
        }
        var reason = details.get("reason");
        return Boolean.TRUE.equals(details.get("retryable")) || "timeout".equals(reason) || "network".equals(reason);
    }

    private static Map<String, Object> details(String key, Object value, boolean retryable) {
        var details = new HashMap<String, Object>();
        details.put(key, value);
        details.put("retryable", retryable);
        return details;
    }

    private static AppException unavailable(String message, Object details, HttpStatus status, Throwable cause) {
        return new ExternalServiceException(ErrorCode.CF_UNAVAILABLE, message, details, status, cause);
    }
}
