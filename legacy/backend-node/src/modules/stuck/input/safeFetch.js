import { lookup as dnsLookup } from 'node:dns/promises';
import { Agent, fetch as undiciFetch } from 'undici';
import { isPrivateAddress } from '../helpers/privateAddress.js';

export const PRIVATE_ADDRESS = 'ERR_PRIVATE_ADDRESS';

/** Raised inside the connection when a host resolves to a private/local address. */
export class PrivateAddressError extends Error {
  constructor(hostname, address) {
    super(`${hostname} resolves to a private or local address${address ? ` (${address})` : ''}`);
    this.name = 'PrivateAddressError';
    this.code = PRIVATE_ADDRESS;
  }
}

const resolvePublic = async (hostname, options, { lookup, isBlocked }) => {
  const addresses = await lookup(hostname, { all: true, verbatim: true, family: options?.family || 0 });
  const blocked = addresses.find(({ address }) => isBlocked(address));
  if (blocked || !addresses.length) throw new PrivateAddressError(hostname, blocked?.address);
  return addresses;
};

/**
 * `net.connect` lookup hook (callback signature required by Node): resolves the host and refuses
 * any private/local address, so the address that is checked is the one the socket connects to
 * (no DNS-rebinding gap between our check and the connection). `lookup` is promise-based.
 */
export const createGuardedLookup = ({ lookup = dnsLookup, isBlocked = isPrivateAddress } = {}) =>
  (hostname, options, callback) => {
    const run = async () => {
      let addresses;
      try {
        addresses = await resolvePublic(hostname, options, { lookup, isBlocked });
      } catch (err) {
        callback(err);
        return;
      }
      if (options?.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    };
    void run();
  };

/** undici fetch on an Agent that connects only to public addresses (one Agent per instance). */
export const createSafeFetch = (options) => {
  const dispatcher = new Agent({ connect: { lookup: createGuardedLookup(options) } });
  const safeFetch = (url, init = {}) => undiciFetch(url, { ...init, dispatcher });
  safeFetch.close = () => dispatcher.close();
  return safeFetch;
};

/** True when `err` (or any of its causes) is the connect-time private-address refusal. */
export const isPrivateAddressError = (err) => {
  for (let current = err; current; current = current.cause) {
    if (current.code === PRIVATE_ADDRESS) return true;
  }
  return false;
};
