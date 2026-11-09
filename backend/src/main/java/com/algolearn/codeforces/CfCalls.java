package com.algolearn.codeforces;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import java.util.function.Supplier;
import org.springframework.http.HttpStatus;

/** Runs a Codeforces call for a service (legacy callCf). */
public final class CfCalls {

    private CfCalls() {
    }

    /**
     * Typed errors from the client (CF_HANDLE_NOT_FOUND, CF_UNAVAILABLE) pass through; anything
     * else means Codeforces could not be reached and becomes 503 CF_UNAVAILABLE with the cause.
     */
    public static <T> T call(Supplier<T> task) {
        try {
            return task.get();
        } catch (AppException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new ExternalServiceException(ErrorCode.CF_UNAVAILABLE, "Codeforces is unavailable right now", null,
                    HttpStatus.SERVICE_UNAVAILABLE, e);
        }
    }
}
