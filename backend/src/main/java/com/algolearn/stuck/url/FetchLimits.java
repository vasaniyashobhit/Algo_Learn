package com.algolearn.stuck.url;

import com.algolearn.stuck.StuckConstants;

/** Link fetch limits (legacy STUCK.url): the whole fetch, the body size and the redirect count. */
public record FetchLimits(long timeoutMs, int maxBytes, int maxRedirects) {

    public static final FetchLimits DEFAULT = new FetchLimits(StuckConstants.URL_TIMEOUT_MS,
            StuckConstants.URL_MAX_BYTES, StuckConstants.URL_MAX_REDIRECTS);
}
