package com.algolearn.llm.provider;

import com.algolearn.llm.LlmConstants;
import com.algolearn.llm.chain.LlmException;
import java.net.SocketTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.function.Consumer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * JSON POSTs for the providers. HTTP error statuses become {@link LlmException#http}, I/O timeouts
 * {@link LlmException#timeout}, other I/O failures reason {@code network}, a non-JSON body reason
 * {@code invalid_response}. The read timeout is the per-call limit; the chain's TimeLimiter clamps it further.
 */
public final class LlmHttp {

    private final RestClient client;
    private final JsonMapper mapper;
    private final String who;

    public LlmHttp(RestClient client, JsonMapper mapper, String who) {
        this.client = client;
        this.mapper = mapper;
        this.who = who;
    }

    /** A RestClient on {@code baseUrl} with a {@link LlmConstants#TIMEOUT_MS} connect and read timeout. */
    public static RestClient client(RestClient.Builder builder, String baseUrl) {
        var timeout = Duration.ofMillis(LlmConstants.TIMEOUT_MS);
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(timeout).build());
        factory.setReadTimeout(timeout);
        return builder.clone().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public JsonMapper mapper() {
        return mapper;
    }

    public JsonNode post(String uri, Consumer<HttpHeaders> headers, Object body) {
        String text;
        try {
            text = client.post().uri(uri).headers(headers).contentType(MediaType.APPLICATION_JSON)
                    .body(mapper.writeValueAsString(body)).retrieve().body(String.class);
        } catch (RestClientResponseException e) {
            throw LlmException.http(who, e.getStatusCode().value(), e);
        } catch (ResourceAccessException e) {
            throw isTimeout(e) ? new LlmException(who + " timed out", null, LlmException.TIMEOUT, e)
                    : new LlmException(who + " could not be reached", null, "network", e);
        }
        try {
            return mapper.readTree(text == null ? "{}" : text);
        } catch (JacksonException e) {
            throw new LlmException(who + " sent a body that is not JSON", null, "invalid_response", e);
        }
    }

    static boolean isTimeout(Throwable error) {
        for (var current = error; current != null; current = current.getCause()) {
            if (current instanceof HttpTimeoutException || current instanceof SocketTimeoutException) {
                return true;
            }
        }
        return false;
    }
}
