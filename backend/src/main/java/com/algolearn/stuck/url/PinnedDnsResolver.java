package com.algolearn.stuck.url;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;
import java.util.function.Predicate;
import org.apache.hc.client5.http.DnsResolver;

/**
 * Connect-time lookup (legacy createGuardedLookup): answers only the addresses the guard already checked, and
 * refuses again if any of them is blocked, so the socket connects to exactly a validated address.
 */
final class PinnedDnsResolver implements DnsResolver {

    private final String host;
    private final List<InetAddress> addresses;
    private final Predicate<InetAddress> isBlocked;

    PinnedDnsResolver(String host, List<InetAddress> addresses, Predicate<InetAddress> isBlocked) {
        this.host = host;
        this.addresses = List.copyOf(addresses);
        this.isBlocked = isBlocked;
    }

    @Override
    public InetAddress[] resolve(String name) throws UnknownHostException {
        if (!host.equalsIgnoreCase(name.replaceAll("^\\[|]$", ""))) {
            throw new UnknownHostException(name + " was not checked by the URL guard");
        }
        var blocked = addresses.stream().filter(isBlocked).findFirst();
        if (blocked.isPresent() || addresses.isEmpty()) {
            throw new PrivateHostException(name, blocked.map(InetAddress::getHostAddress).orElse(null));
        }
        return addresses.toArray(InetAddress[]::new);
    }

    @Override
    public String resolveCanonicalHostname(String name) {
        return name;
    }

    /** The connect-time private-address refusal. */
    static final class PrivateHostException extends UnknownHostException {

        private static final long serialVersionUID = 1L;

        PrivateHostException(String host, String address) {
            super(host + " resolves to a private or local address" + (address == null ? "" : " (" + address + ")"));
        }
    }
}
