package com.algolearn.codeforces;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.json.JsonMapper;

/** Ports legacy cfRequest.test.js. */
class CfRequestTest {

    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void buildsTheMethodUrlWithEncodedParamsAndSkipsNulls() {
        var params = new LinkedHashMap<String, Object>();
        params.put("handle", "tourist");
        params.put("from", 1);
        params.put("count", null);
        assertThat(CfRequest.buildUrl(CfRequest.CF_API_BASE_URL, "user.status", params))
                .hasToString("https://codeforces.com/api/user.status?handle=tourist&from=1");
    }

    @Test
    void joinsListsWithSemicolonsAndToleratesATrailingSlash() {
        assertThat(CfRequest.buildUrl("https://cf.test/api/", "user.info", Map.of("handles", List.of("a", "b"))))
                .hasToString("https://cf.test/api/user.info?handles=a%3Bb");
        assertThat(CfRequest.buildUrl("https://cf.test/api", "problemset.problems", Map.of()))
                .hasToString("https://cf.test/api/problemset.problems");
    }

    @Test
    void returnsTheResultOfAnOkBody() {
        assertThat(CfRequest.parse(200, "{\"status\":\"OK\",\"result\":[1,2]}", mapper))
                .hasToString("[1,2]");
    }

    @Test
    void throwsTheMappedFailedErrorEvenWhenCodeforcesAnswers400() {
        var body = "{\"status\":\"FAILED\",\"comment\":\"handles: User with handle q not found\"}";
        assertThatThrownBy(() -> CfRequest.parse(400, body, mapper))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.code()).isEqualTo(ErrorCode.CF_HANDLE_NOT_FOUND));
    }

    @Test
    void throwsARetryableErrorForAnHtml5xxPage() {
        assertThatThrownBy(() -> CfRequest.parse(503, "<html>down</html>", mapper))
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.status()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(e.details()).isEqualTo(Map.of("status", 503, "retryable", true));
                });
    }

    @Test
    void throwsA502ForUnreadableOrUnexpected200Bodies() {
        for (var body : List.of("nope", "{\"hello\":1}", "")) {
            assertThatThrownBy(() -> CfRequest.parse(200, body, mapper))
                    .isInstanceOfSatisfying(AppException.class, e -> {
                        assertThat(e.status()).isEqualTo(HttpStatus.BAD_GATEWAY);
                        assertThat(e.code()).isEqualTo(ErrorCode.CF_UNAVAILABLE);
                    });
        }
    }
}
