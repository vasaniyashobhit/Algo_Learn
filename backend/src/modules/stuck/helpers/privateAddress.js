import { BlockList, isIP } from 'node:net';

const BLOCKED_V4 = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];
const BLOCKED_V6 = [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96]];

const blocked = new BlockList();
BLOCKED_V4.forEach(([net, prefix]) => blocked.addSubnet(net, prefix, 'ipv4'));
BLOCKED_V6.forEach(([net, prefix]) => blocked.addSubnet(net, prefix, 'ipv6'));

/**
 * True for loopback, private, link-local (incl. 169.254.169.254 cloud metadata), CGNAT,
 * documentation, multicast and reserved ranges, IPv4-mapped IPv6 included. Invalid → true.
 */
export const isPrivateAddress = (address) => {
  const family = isIP(address);
  if (family === 0) return true;
  return blocked.check(address, family === 4 ? 'ipv4' : 'ipv6');
};
