import { describe, expect, it } from 'vitest';
import { isPrivateAddress } from '../../../../src/modules/stuck/helpers/privateAddress.js';

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1', '127.255.0.9', '10.0.0.1', '172.16.5.4', '172.31.255.255', '192.168.1.10',
    '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1',
    '::1', '::', 'fe80::1', 'fd12:3456::1', 'fc00::1', 'ff02::1',
    '::ffff:127.0.0.1', '::ffff:169.254.169.254', '::ffff:10.0.0.1',
  ])('blocks %s', (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '104.18.2.1', '2606:4700::6810:1', '::ffff:8.8.8.8'])(
    'allows public %s',
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    },
  );

  it('treats anything that is not an IP as blocked', () => {
    expect(isPrivateAddress('localhost')).toBe(true);
    expect(isPrivateAddress('')).toBe(true);
  });
});
