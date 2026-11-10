package com.algolearn.stuck.url;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.List;

/** DNS lookup of every address of a host (legacy dns.lookup with all: true). Tests inject a fixed table. */
@FunctionalInterface
public interface HostResolver {

    HostResolver SYSTEM = host -> List.of(InetAddress.getAllByName(host));

    List<InetAddress> resolve(String host) throws UnknownHostException;
}
