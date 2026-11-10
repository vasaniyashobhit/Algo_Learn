package com.algolearn.stuck.url;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/** Legacy privateAddress.test.js and codeforcesUrl.test.js. */
class AddressAndCodeforcesUrlTest {

    @ParameterizedTest
    @ValueSource(strings = {"127.0.0.1", "127.255.0.9", "10.0.0.1", "172.16.5.4", "172.31.255.255", "192.168.1.10",
        "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1", "::1", "::",
        "fe80::1", "fd12:3456::1", "fc00::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:169.254.169.254",
        "::ffff:10.0.0.1", "64:ff9b::a00:1", "localhost", "", "not-an-ip", "999.1.1.1"})
    void blocksPrivateReservedAndNonIpAddresses(String address) {
        assertThat(PrivateAddress.isPrivate(address)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"8.8.8.8", "1.1.1.1", "172.32.0.1", "104.18.2.1", "2606:4700::6810:1", "::ffff:8.8.8.8"})
    void allowsPublicAddresses(String address) {
        assertThat(PrivateAddress.isPrivate(address)).isFalse();
    }

    @ParameterizedTest
    @CsvSource({
        "https://codeforces.com/contest/1/problem/A, 1/A",
        "https://codeforces.com/problemset/problem/1950/f2, 1950/F2",
        "http://www.codeforces.com/contest/1723/problem/GP1/, 1723/GP1",
        "https://m1.codeforces.com/problemset/problem/4/A?locale=en, 4/A",
        "https://codeforces.ru/contest/921/problem/01, 921/01",
        "https://codeforces.com/gym/104114/problem/B, 104114/B",
        "https://codeforces.com/contest/0001/problem/A, 1/A",
        "HTTPS://CODEFORCES.COM/contest/2/problem/b, 2/B"})
    void parsesCodeforcesProblemLinks(String href, String id) {
        assertThat(CodeforcesUrl.problemId(URI.create(href))).contains(id);
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://codeforces.com/blog/entry/1", "https://codeforces.com/contest/1",
        "https://codeforces.com/contest/1/problem/ABCD", "https://evil-codeforces.com/contest/1/problem/A",
        "https://codeforces.com.evil.io/contest/1/problem/A", "ftp://codeforces.com/contest/1/problem/A",
        "https://atcoder.jp/contests/abc001/tasks/abc001_1", "mailto:a@codeforces.com"})
    void returnsEmptyForOtherLinks(String href) {
        assertThat(CodeforcesUrl.problemId(URI.create(href))).isEmpty();
    }
}
