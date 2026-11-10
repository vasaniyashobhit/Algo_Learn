package com.algolearn.stuck.url;

import com.algolearn.stuck.StuckConstants;
import com.algolearn.stuck.input.MainText;
import com.algolearn.stuck.input.TextTidy;
import com.algolearn.stuck.url.PageFetcher.FetchFailure;
import com.algolearn.stuck.url.PageFetcher.FetchedPage;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Clock;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Legacy fromUrl: a Codeforces problem link → its id (no fetch); any other link → the page's main text, SSRF-checked
 * on every hop, limits for the whole fetch. Failures are URL_NOT_ALLOWED or URL_FETCH_FAILED (details.reason).
 */
public class FromUrl {

    private static final Set<Integer> REDIRECTS = Set.of(301, 302, 303, 307, 308);
    private static final Pattern HTML = Pattern.compile("text/html|application/xhtml\\+xml", Pattern.CASE_INSENSITIVE);
    private static final Pattern PLAIN = Pattern.compile("text/plain", Pattern.CASE_INSENSITIVE);

    private final UrlGuard guard;
    private final PageFetcher fetcher;
    private final Clock clock;
    private final FetchLimits limits;

    public FromUrl(UrlGuard guard, PageFetcher fetcher, Clock clock, FetchLimits limits) {
        this.guard = guard;
        this.fetcher = fetcher;
        this.clock = clock;
        this.limits = limits;
    }

    /** {@code problemId} for a Codeforces link, else the page {@code text}. */
    public Result read(String raw) {
        var url = UrlGuard.parse(raw);
        var problemId = CodeforcesUrl.problemId(url);
        if (problemId.isPresent()) {
            return new Result(problemId.get(), null);
        }
        var page = fetchPage(url);
        if (!page.ok()) {
            throw UrlErrors.status(page.status(), "The page answered HTTP " + page.status());
        }
        var type = page.contentType() == null ? "" : page.contentType();
        var text = "";
        if (HTML.matcher(type).find()) {
            text = MainText.extract(page.body());
        } else if (PLAIN.matcher(type).find()) {
            text = TextTidy.tidy(page.body());
        } else {
            throw UrlErrors.failed("The link is not a web page we can read", null, "reason", "unsupported_type");
        }
        if (text.length() < StuckConstants.MIN_TEXT_LENGTH) {
            throw UrlErrors.failed("No problem text was found on that page", null, "reason", "no_text");
        }
        return new Result(null, TextTidy.cap(text, StuckConstants.MAX_TEXT_LENGTH));
    }

    private FetchedPage fetchPage(URI start) {
        var deadline = clock.millis() + limits.timeoutMs();
        var url = start;
        for (var hop = 0; hop <= limits.maxRedirects(); hop++) {
            var addresses = guard.check(url);
            var left = Math.max(1, deadline - clock.millis());
            FetchedPage page;
            try {
                page = fetcher.fetch(url, addresses, left, limits.maxBytes());
            } catch (FetchFailure e) {
                throw UrlErrors.of(e, left, limits.maxBytes());
            }
            if (!REDIRECTS.contains(page.status())) {
                return page;
            }
            var base = url.getRawPath() == null || url.getRawPath().isEmpty() ? url.resolve("/") : url;
            url = base.resolve(location(page));
        }
        throw UrlErrors.failed("The link redirects too many times", null, "reason", "too_many_redirects");
    }

    private static URI location(FetchedPage page) {
        if (page.location() == null) {
            throw UrlErrors.status(page.status(), "The link redirects nowhere");
        }
        try {
            return new URI(UrlText.encodeIllegal(page.location()));
        } catch (URISyntaxException e) {
            throw UrlErrors.status(page.status(), "The link redirects nowhere");
        }
    }

    /** A Codeforces problem id, or the page text. */
    public record Result(String problemId, String text) {
    }
}
