package com.algolearn.stuck.url;

import java.net.InetAddress;
import java.net.URI;
import java.util.List;

/**
 * One HTTP GET hop without following redirects, connecting only to {@code addresses} (already checked by the
 * {@link UrlGuard}; no second DNS lookup, so no rebinding gap). The body (UTF-8, at most {@code maxBytes}) is read
 * only for a 2xx answer. Failures throw {@link FetchFailure}. Tests inject fakes.
 */
@FunctionalInterface
public interface PageFetcher {

    FetchedPage fetch(URI url, List<InetAddress> addresses, long timeoutMs, int maxBytes);

    /** Status, the redirect target and content type headers (null when absent), the body (null unless 2xx). */
    record FetchedPage(int status, String location, String contentType, String body) {

        public boolean ok() {
            return status >= 200 && status < 300;
        }
    }

    /** Why a hop failed: timeout, a network error, a body over the limit, or a private address at connect time. */
    enum Kind { TIMEOUT, NETWORK, TOO_LARGE, PRIVATE }

    /** A failed hop. */
    final class FetchFailure extends RuntimeException {

        private static final long serialVersionUID = 1L;

        private final Kind kind;

        public FetchFailure(Kind kind, String message, Throwable cause) {
            super(message, cause);
            this.kind = kind;
        }

        public Kind kind() {
            return kind;
        }
    }
}
