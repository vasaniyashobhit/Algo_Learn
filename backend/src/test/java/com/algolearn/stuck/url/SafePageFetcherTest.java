package com.algolearn.stuck.url;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.stuck.url.PageFetcher.FetchFailure;
import com.algolearn.stuck.url.PageFetcher.Kind;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import java.net.InetAddress;
import java.net.URI;
import java.time.Clock;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;

/**
 * Legacy integration safeFetch.test.js: a real server on 127.0.0.1. "rebind.test" is pinned to it, as a
 * DNS-rebinding host would resolve after passing the first lookup.
 */
class SafePageFetcherTest {

    @RegisterExtension
    static final WireMockExtension SERVER = WireMockExtension.newInstance()
            .options(wireMockConfig().dynamicPort().bindAddress("127.0.0.1")).build();

    private static final List<InetAddress> LOOPBACK = List.of(InetAddress.getLoopbackAddress());
    private final SafePageFetcher open = new SafePageFetcher(Clock.systemUTC(), address -> false);

    private static URI url(String host, String path) {
        return URI.create("http://" + host + ":" + SERVER.getPort() + path);
    }

    private static FetchFailure failure(Runnable call) {
        return catchThrowableOfType(FetchFailure.class, call::run);
    }

    @Test
    void refusesToConnectWhenThePinnedAddressIsPrivate() {
        var error = failure(() -> new SafePageFetcher(Clock.systemUTC()).fetch(url("rebind.test", "/"), LOOPBACK,
                2_000, 100));
        assertThat(error.kind()).isEqualTo(Kind.PRIVATE);
        assertThat(error.getMessage()).contains("rebind.test resolves to a private or local address (127.0.0.1)");
        assertThat(SERVER.getAllServeEvents()).isEmpty();
    }

    @Test
    void connectsToExactlyThePinnedAddressAndKeepsTheHostHeader() {
        SERVER.stubFor(get(urlEqualTo("/page")).willReturn(aResponse().withHeader("Content-Type", "text/plain")
                .withBody("hello from the inside")));
        var page = open.fetch(url("rebind.test", "/page"), LOOPBACK, 2_000, 100);
        assertThat(page).isEqualTo(new PageFetcher.FetchedPage(200, null, "text/plain", "hello from the inside"));
        var request = SERVER.getAllServeEvents().getFirst().getRequest();
        assertThat(request.getHeader("Host")).isEqualTo("rebind.test:" + SERVER.getPort());
        assertThat(request.getHeader("Accept")).isEqualTo("text/html, text/plain");
    }

    @Test
    void returnsRedirectsAndErrorsWithoutReadingTheirBody() {
        SERVER.stubFor(get(urlEqualTo("/old")).willReturn(aResponse().withStatus(302).withHeader("Location", "/new")));
        SERVER.stubFor(get(urlEqualTo("/gone")).willReturn(aResponse().withStatus(404).withBody("nope")));
        assertThat(open.fetch(url("rebind.test", "/old"), LOOPBACK, 2_000, 100).location()).isEqualTo("/new");
        assertThat(open.fetch(url("rebind.test", "/gone"), LOOPBACK, 2_000, 100).body()).isNull();
    }

    @Test
    void stopsABodyOverTheLimitDeclaredOrStreamed() {
        SERVER.stubFor(get(urlEqualTo("/big")).willReturn(aResponse().withBody("x".repeat(500))));
        SERVER.stubFor(get(urlEqualTo("/chunked")).willReturn(aResponse().withChunkedDribbleDelay(5, 20)
                .withBody("y".repeat(500))));
        assertThat(failure(() -> open.fetch(url("rebind.test", "/big"), LOOPBACK, 2_000, 50)).kind())
                .isEqualTo(Kind.TOO_LARGE);
        assertThat(failure(() -> open.fetch(url("rebind.test", "/chunked"), LOOPBACK, 2_000, 50)).kind())
                .isEqualTo(Kind.TOO_LARGE);
    }

    @Test
    void mapsASlowAnswerToATimeout() {
        SERVER.stubFor(get(urlEqualTo("/slow")).willReturn(aResponse().withFixedDelay(1_000).withBody("late")));
        assertThat(failure(() -> open.fetch(url("rebind.test", "/slow"), LOOPBACK, 150, 100)).kind())
                .isEqualTo(Kind.TIMEOUT);
    }

    @Test
    void mapsAHostTheGuardNeverCheckedAndAClosedPortToNetworkErrors() {
        var unchecked = new SafePageFetcher(Clock.systemUTC(), address -> false) {
            @Override
            public FetchedPage fetch(URI url, List<InetAddress> addresses, long timeoutMs, int maxBytes) {
                return super.fetch(url, List.of(), timeoutMs, maxBytes);
            }
        };
        assertThat(failure(() -> unchecked.fetch(url("rebind.test", "/"), LOOPBACK, 2_000, 100)).kind())
                .isEqualTo(Kind.PRIVATE);
        assertThat(failure(() -> open.fetch(URI.create("http://127.0.0.1:1/"), LOOPBACK, 2_000, 100)).kind())
                .isEqualTo(Kind.NETWORK);
    }
}
