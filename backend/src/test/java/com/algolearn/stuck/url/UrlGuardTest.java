package com.algolearn.stuck.url;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.FieldIssue;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Legacy urlGuard.test.js: the SSRF guard (checked after DNS) and parseUrl. */
class UrlGuardTest {

    private final UrlFakes.Hosts hosts = new UrlFakes.Hosts().add("example.com", "93.184.216.34")
            .add("rebind.example", "93.184.216.34", "127.0.0.1").add("metadata.example", "169.254.169.254")
            .add("v6.example", "2606:4700::6810:1").add("internal.example", "fd00::5").add("127.0.0.1", "127.0.0.1")
            .add("::1", "::1").add("10.0.0.7", "10.0.0.7").add("empty.example");
    private final UrlGuard guard = new UrlGuard(hosts);

    private AppException refused(String href) {
        return catchThrowableOfType(AppException.class, () -> guard.check(UrlGuard.parse(href)));
    }

    private void expectNotAllowed(String href, String reason) {
        var error = refused(href);
        assertThat(error.status().value()).isEqualTo(400);
        assertThat(error.code()).isEqualTo(ErrorCode.URL_NOT_ALLOWED);
        assertThat(error.details()).isEqualTo(Map.of("reason", reason));
    }

    @Test
    void allowsPublicHttpHostsOnDefaultPortsAndReturnsTheCheckedAddresses() {
        assertThat(guard.check(URI.create("https://example.com/p"))).hasSize(1);
        assertThat(guard.check(URI.create("http://example.com:80/p"))).hasSize(1);
        assertThat(guard.check(URI.create("http://example.com:443/p"))).hasSize(1);
        assertThat(guard.check(URI.create("https://v6.example/"))).hasSize(1);
        assertThat(hosts.lookups).contains("example.com", "v6.example");
    }

    @ParameterizedTest
    @ValueSource(strings = {"file:///etc/passwd", "ftp://example.com/x", "gopher://example.com/", "data:text/plain,hi",
        "javascript:alert(1)"})
    void refusesNonHttpSchemes(String href) {
        expectNotAllowed(href, "scheme");
    }

    @ParameterizedTest
    @ValueSource(strings = {"http://localhost/", "http://LOCALHOST:80/", "http://api.localhost/", "http://127.0.0.1/",
        "http://[::1]/", "http://10.0.0.7/", "https://metadata.example/latest", "https://internal.example/",
        "https://rebind.example/", "https://empty.example/"})
    void refusesPrivateTargetsCheckedAfterDns(String href) {
        expectNotAllowed(href, "private");
    }

    @Test
    void refusesCredentialsAndNonStandardPorts() {
        expectNotAllowed("https://user:pw@example.com/", "credentials");
        expectNotAllowed("http://example.com:6379/", "port");
    }

    @Test
    void mapsDnsFailuresToUrlFetchFailed() {
        var error = refused("https://nowhere.example/");
        assertThat(error.status().value()).isEqualTo(502);
        assertThat(error.code()).isEqualTo(ErrorCode.URL_FETCH_FAILED);
        assertThat(error.details()).isEqualTo(Map.of("reason", "dns"));
    }

    @Test
    void parsesATrimmedUrlAndEncodesWhatBrowsersAccept() {
        assertThat(UrlGuard.parse("  https://example.com/a ").toString()).isEqualTo("https://example.com/a");
        assertThat(UrlGuard.parse("https://example.com/a b|ü").toString())
                .isEqualTo("https://example.com/a%20b%7C%C3%BC");
    }

    @ParameterizedTest
    @ValueSource(strings = {"not a url", "example.com/p", "", "https://", "http:///nohost"})
    void reportsAnInvalidUrlAsValidationFailedOnTheUrlField(String raw) {
        var error = catchThrowableOfType(AppException.class, () -> UrlGuard.parse(raw));
        assertThat(error.code()).isEqualTo(ErrorCode.VALIDATION_FAILED);
        assertThat(error.details()).isEqualTo(List.of(new FieldIssue("body.url", UrlGuard.BAD_URL)));
        assertThat(catchThrowableOfType(AppException.class, () -> UrlGuard.parse(null)).code())
                .isEqualTo(ErrorCode.VALIDATION_FAILED);
    }
}
