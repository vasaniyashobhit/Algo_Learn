package com.algolearn.stuck.url;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.stuck.url.PageFetcher.FetchFailure;
import com.algolearn.stuck.url.PageFetcher.Kind;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

/** Legacy guarded connect lookup (safeFetch.test.js) and readLimitedBody.test.js. */
class PinnedDnsAndBodyTest {

    @Test
    void answersOnlyTheCheckedAddressesOfTheCheckedHost() throws Exception {
        var publicIp = InetAddress.getByName("93.184.216.34");
        var resolver = new PinnedDnsResolver("example.com", List.of(publicIp), PrivateAddress::isPrivate);
        assertThat(resolver.resolve("EXAMPLE.com")).containsExactly(publicIp);
        assertThat(resolver.resolveCanonicalHostname("example.com")).isEqualTo("example.com");
        assertThat(catchThrowableOfType(UnknownHostException.class, () -> resolver.resolve("other.com")))
                .hasMessageContaining("not checked");
    }

    @Test
    void refusesPrivateAddressesAndHostsWithoutAny() throws Exception {
        var evil = new PinnedDnsResolver("evil.test", List.of(InetAddress.getByName("10.0.0.1")),
                PrivateAddress::isPrivate);
        assertThat(catchThrowableOfType(PinnedDnsResolver.PrivateHostException.class, () -> evil.resolve("evil.test")))
                .hasMessage("evil.test resolves to a private or local address (10.0.0.1)");
        var empty = new PinnedDnsResolver("empty.test", List.of(), PrivateAddress::isPrivate);
        assertThat(catchThrowableOfType(UnknownHostException.class, () -> empty.resolve("empty.test")))
                .hasMessage("empty.test resolves to a private or local address");
    }

    @Test
    void findsTheRefusalAnywhereInACauseChain() {
        var wrapped = new IllegalStateException("outer", new IOException("fetch failed",
                new PinnedDnsResolver.PrivateHostException("h", null)));
        assertThat(SafePageFetcher.failure(wrapped).kind()).isEqualTo(Kind.PRIVATE);
        assertThat(SafePageFetcher.failure(new IOException("x")).kind()).isEqualTo(Kind.NETWORK);
        var known = new FetchFailure(Kind.TOO_LARGE, "big", null);
        assertThat(SafePageFetcher.failure(new IOException("wrapped", known))).isSameAs(known);
    }

    @Test
    void readsABodyUnderTheLimitAsUtf8() throws IOException {
        var body = new ByteArrayInputStream("héllo world".getBytes(StandardCharsets.UTF_8));
        assertThat(LimitedBody.read(body, -1, 100, Long.MAX_VALUE, () -> 0)).isEqualTo("héllo world");
        assertThat(LimitedBody.read(null, -1, 10, Long.MAX_VALUE, () -> 0)).isEmpty();
    }

    @Test
    void rejectsADeclaredLengthOverTheLimitWithoutReading() {
        var error = catchThrowableOfType(FetchFailure.class, () -> LimitedBody.read(InputStream.nullInputStream(),
                5_000, 10, Long.MAX_VALUE, () -> 0));
        assertThat(error.kind()).isEqualTo(Kind.TOO_LARGE);
        assertThat(error).hasMessage("The response is larger than 10 bytes");
    }

    @Test
    void stopsAnEndlessStreamOnceTheLimitOrTheDeadlinePasses() {
        var pulls = new AtomicInteger();
        var endless = new InputStream() {
            @Override
            public int read() {
                return 1;
            }

            @Override
            public int read(byte[] b, int off, int len) {
                pulls.incrementAndGet();
                return Math.min(len, 4);
            }
        };
        assertThat(catchThrowableOfType(FetchFailure.class, () -> LimitedBody.read(endless, -1, 10, Long.MAX_VALUE,
                () -> 0)).kind()).isEqualTo(Kind.TOO_LARGE);
        assertThat(pulls.get()).isLessThan(10);
        assertThat(catchThrowableOfType(FetchFailure.class, () -> LimitedBody.read(endless, -1, 1_000, 5,
                () -> 9)).kind()).isEqualTo(Kind.TIMEOUT);
    }
}
