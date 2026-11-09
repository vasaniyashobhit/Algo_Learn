package com.algolearn.codeforces;

import static com.github.tomakehurst.wiremock.client.WireMock.anyUrl;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.codeforces.CfTestClients.CountingQueue;
import com.algolearn.codeforces.dto.CfProblem;
import com.algolearn.codeforces.dto.CfUser;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;

/** Ports legacy codeforces.client.success.test.js against WireMock. */
class RestCodeforcesClientSuccessTest {

    @RegisterExtension
    static final WireMockExtension CF = WireMockExtension.newInstance().options(wireMockConfig().dynamicPort()).build();

    private final CountingQueue queue = new CountingQueue();
    private CodeforcesClient client;

    @BeforeEach
    void setUp() {
        client = CfTestClients.client(CF.baseUrl() + "/api", queue);
    }

    private static void answer(String resultJson) {
        CF.stubFor(get(anyUrl()).willReturn(okJson("{\"status\":\"OK\",\"result\":" + resultJson + "}")));
    }

    @Test
    void spacesCallsBy2100MsByDefault() {
        assertThat(CodeforcesConfig.CF_MIN_INTERVAL_MS).isEqualTo(2_100);
        assertThat(CodeforcesConfig.CF_TIMEOUT).hasSeconds(20);
        assertThat(CodeforcesConfig.CF_RETRY.retries()).isEqualTo(2);
    }

    @Test
    void problemsetProblemsCallsTheMethodAndMapsTheResult() {
        answer("{\"problems\":[{\"contestId\":1,\"index\":\"A\",\"name\":\"T\",\"rating\":800,\"tags\":[\"math\"],"
                + "\"points\":500}],\"problemStatistics\":[{\"contestId\":1,\"index\":\"A\",\"solvedCount\":9}]}");
        var result = client.problemsetProblems();
        assertThat(result.problems()).containsExactly(new CfProblem(1, "A", "T", null, 800, List.of("math")));
        assertThat(result.problemStatistics().getFirst().solvedCount()).isEqualTo(9);
        CF.verify(getRequestedFor(urlEqualTo("/api/problemset.problems")));
        assertThat(queue.calls()).isEqualTo(1);
    }

    @Test
    void problemsetProblemsCanFilterByTags() {
        answer("{\"problems\":[]}");
        client.problemsetProblems(List.of("dp", "math"));
        client.problemsetProblems(List.of());
        CF.verify(getRequestedFor(urlEqualTo("/api/problemset.problems?tags=dp%3Bmath")));
        CF.verify(getRequestedFor(urlEqualTo("/api/problemset.problems")));
    }

    @Test
    void userInfoAcceptsOneHandleOrMany() {
        answer("[{\"handle\":\"tourist\",\"rating\":3800,\"maxRating\":4000,\"rank\":\"legendary\"}]");
        assertThat(client.userInfo("tourist")).containsExactly(new CfUser("tourist", 3800, 4000));
        client.userInfo(List.of("a", "b"));
        CF.verify(getRequestedFor(urlEqualTo("/api/user.info?handles=tourist")));
        CF.verify(getRequestedFor(urlEqualTo("/api/user.info?handles=a%3Bb")));
    }

    @Test
    void userStatusPassesHandleFromAndCount() {
        answer("[{\"id\":7,\"contestId\":1,\"creationTimeSeconds\":1700000000,\"verdict\":\"OK\","
                + "\"problem\":{\"contestId\":1,\"index\":\"A\",\"tags\":[]}}]");
        var submissions = client.userStatus("tourist", 101, 100);
        client.userStatus("tourist");
        assertThat(submissions.getFirst().id()).isEqualTo(7L);
        assertThat(submissions.getFirst().problem().index()).isEqualTo("A");
        CF.verify(getRequestedFor(urlEqualTo("/api/user.status?handle=tourist&from=101&count=100")));
        CF.verify(getRequestedFor(urlEqualTo("/api/user.status?handle=tourist&from=1")));
    }
}
