package com.algolearn.stuck.url;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import com.algolearn.common.validation.JsText;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;

/**
 * Legacy urlGuard (SSRF): only http(s) on ports 80/443, no credentials, no localhost, and every address the host
 * resolves to must be public. Returns the checked addresses; the fetcher connects only to these. Run again on every
 * redirect hop.
 */
public class UrlGuard {

    static final String BAD_URL = "Enter a full link, e.g. https://codeforces.com/problemset/problem/1/A";
    private static final Set<Integer> PORTS = Set.of(-1, 80, 443);

    private final HostResolver resolver;

    public UrlGuard(HostResolver resolver) {
        this.resolver = resolver;
    }

    public static ValidationException notAllowed(String message, String reason, Throwable cause) {
        return new ValidationException(ErrorCode.URL_NOT_ALLOWED, message, Map.of("reason", reason), cause);
    }

    public List<InetAddress> check(URI url) {
        var scheme = url.getScheme() == null ? "" : JsText.lower(url.getScheme());
        if (!scheme.equals("http") && !scheme.equals("https") || url.isOpaque()) {
            throw notAllowed("Only http and https links are supported", "scheme", null);
        }
        if (url.getRawUserInfo() != null) {
            throw notAllowed("Links with a username or password are not allowed", "credentials", null);
        }
        if (!PORTS.contains(url.getPort())) {
            throw notAllowed("Only links on the standard web ports are allowed", "port", null);
        }
        var host = hostOf(url);
        if (host.equals("localhost") || host.endsWith(".localhost")) {
            throw notAllowed("Local addresses are not allowed", "private", null);
        }
        List<InetAddress> addresses;
        try {
            addresses = resolver.resolve(host);
        } catch (UnknownHostException | SecurityException e) {
            throw new ExternalServiceException(ErrorCode.URL_FETCH_FAILED, "The host of this link could not be found",
                    Map.of("reason", "dns"), HttpStatus.BAD_GATEWAY, e);
        }
        if (addresses.isEmpty() || addresses.stream().anyMatch(PrivateAddress::isPrivate)) {
            throw notAllowed("Links to private or local network addresses are not allowed", "private", null);
        }
        return addresses;
    }

    /** Lower-cased host without IPv6 brackets ('' when the URL has none). */
    public static String hostOf(URI url) {
        var host = url.getHost() == null ? "" : url.getHost();
        return JsText.lower(host.replaceAll("^\\[|]$", ""));
    }

    /** Legacy parseUrl: a trimmed absolute URL, or 400 VALIDATION_FAILED on {@code body.url}. */
    public static URI parse(String raw) {
        var text = JsText.trim(raw == null ? "" : raw);
        try {
            var uri = new URI(UrlText.encodeIllegal(text));
            if (uri.getScheme() == null || !uri.isOpaque() && uri.getHost() == null && isWebScheme(uri)) {
                throw new IllegalArgumentException("not an absolute URL");
            }
            return uri;
        } catch (URISyntaxException | IllegalArgumentException e) {
            var issue = new FieldIssue("body.url", BAD_URL);
            throw new ValidationException(ErrorCode.VALIDATION_FAILED, "Request validation failed", List.of(issue), e);
        }
    }

    private static boolean isWebScheme(URI uri) {
        var scheme = JsText.lower(uri.getScheme());
        return scheme.equals("http") || scheme.equals("https");
    }
}
