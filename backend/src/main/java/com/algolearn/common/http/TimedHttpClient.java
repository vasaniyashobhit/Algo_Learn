package com.algolearn.common.http;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import java.net.SocketTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

/**
 * RestClient calls with a timeout (default per client, optional per call). A timeout becomes a
 * 503 ExternalServiceException ({@code reason: timeout, timeoutMs}), any other I/O failure a 502
 * ({@code reason: network}), both with {@code errorCode} and the original as cause. HTTP error
 * statuses (RestClientResponseException) pass through for the caller to map.
 */
public class TimedHttpClient {

    public static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(10);

    private final RestClient.Builder builder;
    private final Duration timeout;
    private final ErrorCode errorCode;
    private final Map<Duration, RestClient> clients = new ConcurrentHashMap<>();

    public TimedHttpClient(RestClient.Builder builder, Duration timeout, ErrorCode errorCode) {
        this.builder = builder;
        this.timeout = timeout;
        this.errorCode = errorCode;
    }

    public <T> T call(Function<RestClient, T> request) {
        return call(timeout, request);
    }

    public <T> T call(Duration callTimeout, Function<RestClient, T> request) {
        var client = clients.computeIfAbsent(callTimeout, this::build);
        try {
            return request.apply(client);
        } catch (ResourceAccessException e) {
            throw translate(e, callTimeout);
        }
    }

    private ExternalServiceException translate(ResourceAccessException error, Duration callTimeout) {
        if (isTimeout(error)) {
            var ms = callTimeout.toMillis();
            return new ExternalServiceException(errorCode, "Request timed out after %dms".formatted(ms),
                    Map.of("reason", "timeout", "timeoutMs", ms), HttpStatus.SERVICE_UNAVAILABLE, error);
        }
        return new ExternalServiceException(errorCode, "The request could not be completed",
                Map.of("reason", "network"), HttpStatus.BAD_GATEWAY, error);
    }

    static boolean isTimeout(Throwable error) {
        for (var current = error; current != null; current = current.getCause()) {
            if (current instanceof HttpTimeoutException || current instanceof SocketTimeoutException) {
                return true;
            }
        }
        return false;
    }

    private RestClient build(Duration callTimeout) {
        var http = HttpClient.newBuilder().connectTimeout(callTimeout).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(callTimeout);
        return builder.clone().requestFactory(factory).build();
    }
}
