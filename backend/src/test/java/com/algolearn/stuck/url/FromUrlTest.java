package com.algolearn.stuck.url;

import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static com.algolearn.stuck.StuckFixtures.html;
import static com.algolearn.stuck.url.UrlFakes.page;
import static com.algolearn.stuck.url.UrlFakes.redirect;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.llm.LlmFakes;
import com.algolearn.stuck.url.PageFetcher.FetchFailure;
import com.algolearn.stuck.url.PageFetcher.Kind;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Legacy fromUrl.test.js and safeFetch.test.js (connect-time refusal): success paths and SSRF through redirects. */
class FromUrlTest {

    private final UrlFakes.Hosts hosts = new UrlFakes.Hosts().add("example.com", "93.184.216.34")
            .add("cdn.example.com", "93.184.216.35").add("evil.example", "10.0.0.1")
            .add("169.254.169.254", "169.254.169.254");
    private final UrlFakes.Pages pages = new UrlFakes.Pages();
    private final FromUrl fromUrl = new FromUrl(new UrlGuard(hosts), pages, LlmFakes.clockAt(0), FetchLimits.DEFAULT);
    private final PageFetcher.FetchedPage statement =
            page(html("<nav>menu</nav><main><h1>A. Theatre Square</h1><p>" + STATEMENT + "</p></main>"));

    private AppException failure(String url) {
        return catchThrowableOfType(AppException.class, () -> fromUrl.read(url));
    }

    @Test
    void returnsTheProblemIdOfACodeforcesLinkWithoutFetchingOrDns() {
        assertThat(fromUrl.read("https://codeforces.com/problemset/problem/1/a"))
                .isEqualTo(new FromUrl.Result("1/A", null));
        assertThat(pages.fetched).isEmpty();
        assertThat(hosts.lookups).isEmpty();
    }

    @Test
    void fetchesAnotherPageAndExtractsItsMainTextWithin8Seconds() {
        pages.add("https://example.com/p", statement);
        var text = fromUrl.read("https://example.com/p").text();
        assertThat(text).startsWith("A. Theatre Square\nA. Theatre Square").doesNotContain("menu");
        assertThat(pages.timeouts).containsExactly(8_000L);
    }

    @Test
    void readsPlainTextPagesAndCapsTheText() {
        pages.add("https://example.com/t.txt", page(200, "text/plain", "x".repeat(30_000)));
        assertThat(fromUrl.read("https://example.com/t.txt").text()).hasSize(20_000);
    }

    @Test
    void followsRedirectsReCheckingEveryHost() {
        pages.add("https://example.com/old", redirect("https://cdn.example.com/new", 302))
                .add("https://cdn.example.com/new", statement)
                .add("https://example.com/a/b", redirect("../c", 301)).add("https://example.com/c", statement)
                .add("https://example.com", redirect("x", 307)).add("https://example.com/x", statement);
        assertThat(fromUrl.read("https://example.com/old").text()).isNotEmpty();
        assertThat(hosts.lookups).contains("cdn.example.com");
        assertThat(fromUrl.read("https://example.com/a/b").text()).isNotEmpty();
        assertThat(fromUrl.read("https://example.com").text()).isNotEmpty();
    }

    @Test
    void refusesARedirectToAPrivateAddressBeforeFetchingIt() {
        pages.add("https://example.com/r", redirect("http://evil.example/admin", 302));
        assertThat(failure("https://example.com/r").details()).isEqualTo(Map.of("reason", "private"));
        assertThat(pages.fetched).containsExactly("https://example.com/r");
    }

    @Test
    void refusesARedirectToTheMetadataIpOrANonHttpScheme() {
        pages.add("https://example.com/m", redirect("http://169.254.169.254/latest/meta-data/", 302))
                .add("https://example.com/f", redirect("file:///etc/passwd", 302));
        assertThat(failure("https://example.com/m").code()).isEqualTo(ErrorCode.URL_NOT_ALLOWED);
        assertThat(failure("https://example.com/f").details()).isEqualTo(Map.of("reason", "scheme"));
    }

    @Test
    void refusesAPrivateUrlBeforeAnyFetch() {
        assertThat(failure("http://evil.example/").code()).isEqualTo(ErrorCode.URL_NOT_ALLOWED);
        assertThat(pages.fetched).isEmpty();
    }

    @Test
    void mapsAConnectTimeRefusalToUrlNotAllowedAlthoughTheLookupWasPublic() {
        pages.add("https://example.com/p", () -> {
            throw new FetchFailure(Kind.PRIVATE, "example.com resolves to a private or local address", null);
        });
        var error = failure("https://example.com/p");
        assertThat(error.status().value()).isEqualTo(400);
        assertThat(error.code()).isEqualTo(ErrorCode.URL_NOT_ALLOWED);
        assertThat(error.details()).isEqualTo(Map.of("reason", "private"));
        assertThat(error.getCause()).isInstanceOf(FetchFailure.class);
    }
}
