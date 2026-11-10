package com.algolearn.stuck.url;

import com.algolearn.stuck.url.PageFetcher.FetchedPage;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/** Legacy fakeLookup / fakeFetch / page / redirect (no network). */
public final class UrlFakes {

    private UrlFakes() {
    }

    /** DNS fake: host → addresses (IP literals); unknown hosts fail like ENOTFOUND. Records every lookup. */
    public static final class Hosts implements HostResolver {
        private final Map<String, List<String>> table = new HashMap<>();
        public final List<String> lookups = new ArrayList<>();

        public Hosts add(String host, String... addresses) {
            table.put(host, Arrays.asList(addresses));
            return this;
        }

        public void clear() {
            table.clear();
            lookups.clear();
        }

        @Override
        public List<InetAddress> resolve(String host) throws UnknownHostException {
            lookups.add(host);
            var addresses = table.get(host);
            if (addresses == null) {
                throw new UnknownHostException("getaddrinfo ENOTFOUND " + host);
            }
            var out = new ArrayList<InetAddress>();
            for (var address : addresses) {
                out.add(InetAddress.getByName(address));
            }
            return out;
        }
    }

    /** fetch fake: url → page (or a supplier that throws). Unknown urls → 404. Records every hop. */
    public static final class Pages implements PageFetcher {
        private final Map<String, Supplier<FetchedPage>> routes = new HashMap<>();
        public final List<String> fetched = new ArrayList<>();
        public final List<Long> timeouts = new ArrayList<>();

        public Pages add(String url, FetchedPage page) {
            routes.put(url, () -> page);
            return this;
        }

        public Pages add(String url, Supplier<FetchedPage> route) {
            routes.put(url, route);
            return this;
        }

        public void clear() {
            routes.clear();
            fetched.clear();
            timeouts.clear();
        }

        @Override
        public FetchedPage fetch(java.net.URI url, List<InetAddress> addresses, long timeoutMs, int maxBytes) {
            fetched.add(url.toString());
            timeouts.add(timeoutMs);
            var route = routes.get(url.toString());
            return route == null ? new FetchedPage(404, null, "text/plain", null) : route.get();
        }
    }

    public static FetchedPage page(String body) {
        return new FetchedPage(200, null, "text/html; charset=utf-8", body);
    }

    public static FetchedPage page(int status, String type, String body) {
        return new FetchedPage(status, null, type, status >= 200 && status < 300 ? body : null);
    }

    public static FetchedPage redirect(String location, int status) {
        return new FetchedPage(status, location, null, null);
    }
}
