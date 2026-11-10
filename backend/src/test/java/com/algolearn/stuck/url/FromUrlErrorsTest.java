package com.algolearn.stuck.url;

import static com.algolearn.stuck.StuckFixtures.html;
import static com.algolearn.stuck.url.UrlFakes.page;
import static com.algolearn.stuck.url.UrlFakes.redirect;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.llm.LlmFakes;
import com.algolearn.stuck.url.PageFetcher.FetchFailure;
import com.algolearn.stuck.url.PageFetcher.FetchedPage;
import com.algolearn.stuck.url.PageFetcher.Kind;
import java.util.Map;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

/** Legacy fromUrl.errors.test.js: every failure → URL_FETCH_FAILED with its reason. */
class FromUrlErrorsTest {

    private static final String URL = "https://example.com/p";

    private final UrlFakes.Pages pages = new UrlFakes.Pages();
    private final FromUrl fromUrl = new FromUrl(new UrlGuard(new UrlFakes.Hosts().add("example.com",
            "93.184.216.34")), pages, LlmFakes.clockAt(0), FetchLimits.DEFAULT);

    private AppException failing(Supplier<FetchedPage> route) {
        pages.add(URL, route);
        return catchThrowableOfType(AppException.class, () -> fromUrl.read(URL));
    }

    private static void expect(AppException error, int status, Map<String, Object> details) {
        assertThat(error.status().value()).isEqualTo(status);
        assertThat(error.code()).isEqualTo(ErrorCode.URL_FETCH_FAILED);
        assertThat(error.details()).isEqualTo(details);
    }

    @Test
    void mapsANon2xxAnswer() {
        expect(failing(() -> page(403, "text/html", "no")), 502, Map.of("reason", "status", "status", 403));
    }

    @Test
    void mapsAPageThatIsNotHtmlOrText() {
        expect(failing(() -> page(200, "application/pdf", "%PDF")), 502, Map.of("reason", "unsupported_type"));
        expect(failing(() -> page(200, null, "x")), 502, Map.of("reason", "unsupported_type"));
    }

    @Test
    void mapsAPageWithoutProblemText() {
        expect(failing(() -> page(html("<p>Hi</p>"))), 502, Map.of("reason", "no_text"));
    }

    @Test
    void mapsABodyOverTheCapABrokenStreamAndANetworkError() {
        expect(failing(() -> {
            throw new FetchFailure(Kind.TOO_LARGE, "too large", null);
        }), 502, Map.of("reason", "too_large", "maxBytes", 2 * 1024 * 1024));
        expect(failing(() -> {
            throw new FetchFailure(Kind.NETWORK, "socket hang up", null);
        }), 502, Map.of("reason", "network"));
    }

    @Test
    void mapsATimeoutTo503WithTheTimeLeft() {
        expect(failing(() -> {
            throw new FetchFailure(Kind.TIMEOUT, "slow", null);
        }), 503, Map.of("reason", "timeout", "timeoutMs", 8_000L));
    }

    @Test
    void mapsTooManyRedirectsAndARedirectWithoutALocation() {
        expect(failing(() -> redirect(URL, 302)), 502, Map.of("reason", "too_many_redirects"));
        assertThat(pages.fetched).hasSize(4);
        expect(failing(() -> redirect(null, 302)), 502, Map.of("reason", "status", "status", 302));
        expect(failing(() -> redirect("http://[bad", 301)), 502, Map.of("reason", "status", "status", 301));
    }

    @Test
    void reportsAnInvalidUrlAsValidationFailed() {
        assertThat(catchThrowableOfType(AppException.class, () -> fromUrl.read("example.com/p")).code())
                .isEqualTo(ErrorCode.VALIDATION_FAILED);
    }
}
