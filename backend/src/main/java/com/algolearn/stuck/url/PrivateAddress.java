package com.algolearn.stuck.url;

import java.math.BigInteger;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Legacy isPrivateAddress: loopback, private, link-local (incl. 169.254.169.254 cloud metadata), CGNAT,
 * documentation, benchmarking, multicast and reserved ranges, IPv4-mapped IPv6 included. Anything that is not
 * an IP literal counts as blocked (never resolved here).
 */
public final class PrivateAddress {

    private static final Pattern V4 = Pattern.compile("^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d"
            + "|1\\d\\d|[1-9]?\\d)){3}$");
    private static final List<String> BLOCKED = List.of(
            "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12",
            "192.0.0.0/24", "192.0.2.0/24", "192.168.0.0/16", "198.18.0.0/15", "198.51.100.0/24",
            "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
            "::/128", "::1/128", "fc00::/7", "fe80::/10", "ff00::/8", "64:ff9b::/96");

    private PrivateAddress() {
    }

    public static boolean isPrivate(String address) {
        return parse(address).map(PrivateAddress::isPrivate).orElse(true);
    }

    public static boolean isPrivate(InetAddress address) {
        return BLOCKED.stream().anyMatch(cidr -> inRange(address, cidr));
    }

    /** An IP literal (IPv4 dotted quad, or anything with a colon as IPv6); never a DNS lookup. */
    static Optional<InetAddress> parse(String address) {
        if (address == null || !(V4.matcher(address).matches() || address.contains(":"))) {
            return Optional.empty();
        }
        try {
            return Optional.of(InetAddress.getByName(address));
        } catch (UnknownHostException | SecurityException e) {
            return Optional.empty();
        }
    }

    private static boolean inRange(InetAddress address, String cidr) {
        var slash = cidr.indexOf('/');
        var network = parse(cidr.substring(0, slash)).orElseThrow();
        var prefix = Integer.parseInt(cidr.substring(slash + 1));
        if ((address instanceof Inet4Address) != (network instanceof Inet4Address)) {
            return false;
        }
        var bits = address.getAddress().length * 8;
        var mask = BigInteger.ONE.shiftLeft(bits).subtract(BigInteger.ONE)
                .shiftRight(prefix).not().and(BigInteger.ONE.shiftLeft(bits).subtract(BigInteger.ONE));
        var a = new BigInteger(1, address.getAddress()).and(mask);
        var n = new BigInteger(1, network.getAddress()).and(mask);
        return a.equals(n);
    }
}
