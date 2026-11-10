package com.algolearn.stuck.url;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.InetAddress;
import java.net.URI;
import java.time.Clock;
import java.util.List;
import java.util.function.Predicate;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

/**
 * The real {@link PageFetcher} (legacy safeFetch): RestClient on an Apache client whose DNS resolver is pinned to
 * the guard's addresses (re-checked at connect time). No redirects, retries or cookies; connect, read and body
 * time all bounded by {@code timeoutMs}.
 */
public class SafePageFetcher implements PageFetcher {

    private final Clock clock;
    private final Predicate<InetAddress> isBlocked;

    public SafePageFetcher(Clock clock, Predicate<InetAddress> isBlocked) {
        this.clock = clock;
        this.isBlocked = isBlocked;
    }

    public SafePageFetcher(Clock clock) {
        this(clock, PrivateAddress::isPrivate);
    }

    @Override
    public FetchedPage fetch(URI url, List<InetAddress> addresses, long timeoutMs, int maxBytes) {
        var deadline = clock.millis() + timeoutMs;
        try (var http = client(UrlGuard.hostOf(url), addresses, Timeout.ofMilliseconds(Math.max(1, timeoutMs)))) {
            return RestClient.builder().requestFactory(new HttpComponentsClientHttpRequestFactory(http)).build()
                    .get().uri(url).header(HttpHeaders.ACCEPT, "text/html, text/plain")
                    .exchange((request, response) -> {
                        var status = response.getStatusCode().value();
                        var headers = response.getHeaders();
                        var body = status >= 200 && status < 300 ? LimitedBody.read(response.getBody(),
                                headers.getContentLength(), maxBytes, deadline, clock::millis) : null;
                        return new FetchedPage(status, headers.getFirst(HttpHeaders.LOCATION),
                                headers.getFirst(HttpHeaders.CONTENT_TYPE), body);
                    });
        } catch (ResourceAccessException e) {
            throw failure(e.getCause() == null ? e : e.getCause());
        } catch (IOException e) {
            throw failure(e);
        }
    }

    private CloseableHttpClient client(String host, List<InetAddress> addresses, Timeout timeout) {
        var connections = PoolingHttpClientConnectionManagerBuilder.create()
                .setDnsResolver(new PinnedDnsResolver(host, addresses, isBlocked))
                .setDefaultConnectionConfig(ConnectionConfig.custom().setConnectTimeout(timeout)
                        .setSocketTimeout(timeout).build())
                .build();
        return HttpClients.custom().setConnectionManager(connections).disableRedirectHandling()
                .disableAutomaticRetries().disableCookieManagement()
                .setDefaultRequestConfig(RequestConfig.custom().setResponseTimeout(timeout)
                        .setConnectionRequestTimeout(timeout).build())
                .build();
    }

    /** A timeout, the connect-time refusal, a body over the limit, or any other network error. */
    static FetchFailure failure(Throwable error) {
        for (var current = error; current != null; current = current.getCause()) {
            if (current instanceof FetchFailure known) {
                return known;
            }
            if (current instanceof PinnedDnsResolver.PrivateHostException) {
                return new FetchFailure(Kind.PRIVATE, current.getMessage(), error);
            }
            if (current instanceof InterruptedIOException) {
                return new FetchFailure(Kind.TIMEOUT, "The page took too long to answer", error);
            }
        }
        return new FetchFailure(Kind.NETWORK, "The request could not be completed", error);
    }
}
