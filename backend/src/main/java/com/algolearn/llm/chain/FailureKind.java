package com.algolearn.llm.chain;

import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.util.Set;
import java.util.concurrent.TimeoutException;
import org.springframework.web.client.RestClientResponseException;

/**
 * What the chain does after a failed call:
 * {@link #SICK} timeout or 503 ("high demand") → no retry, next provider now, open the model's circuit;
 * {@link #RETRY} 429, 500, 502, 504 → one more try after a short backoff;
 * {@link #FAIL} anything else (404 model gone, 400, invalid JSON, network error) → next provider.
 */
public enum FailureKind {
    SICK,
    RETRY,
    FAIL;

    private static final Set<Integer> RETRY_STATUSES = Set.of(429, 500, 502, 504);
    private static final int OVERLOADED = 503;

    public static FailureKind of(Throwable error) {
        if (error == null) {
            return FAIL;
        }
        var status = statusOf(error);
        if (isTimeout(error) || status != null && status == OVERLOADED) {
            return SICK;
        }
        return status != null && RETRY_STATUSES.contains(status) ? RETRY : FAIL;
    }

    static Integer statusOf(Throwable error) {
        return switch (error) {
            case LlmException e -> e.status();
            case RestClientResponseException e -> e.getStatusCode().value();
            default -> null;
        };
    }

    static boolean isTimeout(Throwable error) {
        for (var current = error; current != null; current = current.getCause()) {
            var timedOut = current instanceof LlmException e && e.isTimeout();
            if (timedOut || current instanceof TimeoutException || current instanceof HttpTimeoutException
                    || current instanceof SocketTimeoutException) {
                return true;
            }
        }
        return false;
    }
}
