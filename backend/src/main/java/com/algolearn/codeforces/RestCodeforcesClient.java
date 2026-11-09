package com.algolearn.codeforces;

import com.algolearn.codeforces.dto.CfProblemset;
import com.algolearn.codeforces.dto.CfSubmission;
import com.algolearn.codeforces.dto.CfUser;
import com.algolearn.common.error.AppException;
import com.algolearn.common.http.RateLimitQueue;
import com.algolearn.common.http.Retry;
import com.algolearn.common.http.TimedHttpClient;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Codeforces client on RestClient. Every attempt (retries too) goes through the shared rate-limit
 * queue, times out, and timeouts / network errors / 5xx / call-limit failures are retried.
 */
public class RestCodeforcesClient implements CodeforcesClient {

    private static final Logger LOG = LoggerFactory.getLogger(RestCodeforcesClient.class);

    private final TimedHttpClient http;
    private final String baseUrl;
    private final RateLimitQueue queue;
    private final Retry retry;
    private final JsonMapper mapper;

    public RestCodeforcesClient(TimedHttpClient http, String baseUrl, RateLimitQueue queue, Retry retry,
            JsonMapper mapper) {
        this.http = http;
        this.baseUrl = baseUrl;
        this.queue = queue;
        this.retry = retry.withShouldRetry((error, attempt) -> CfErrors.isRetryable(error));
        this.mapper = mapper;
    }

    @Override
    public CfProblemset problemsetProblems(List<String> tags) {
        var params = new LinkedHashMap<String, Object>();
        params.put("tags", tags == null || tags.isEmpty() ? null : tags);
        return call("problemset.problems", params, new TypeReference<CfProblemset>() { });
    }

    @Override
    public List<CfUser> userInfo(List<String> handles) {
        return call("user.info", Map.of("handles", handles), new TypeReference<List<CfUser>>() { });
    }

    @Override
    public List<CfSubmission> userStatus(String handle, int from, Integer count) {
        var params = new LinkedHashMap<String, Object>();
        params.put("handle", handle);
        params.put("from", from);
        params.put("count", count);
        return call("user.status", params, new TypeReference<List<CfSubmission>>() { });
    }

    private <T> T call(String method, Map<String, ?> params, TypeReference<T> type) {
        var url = CfRequest.buildUrl(baseUrl, method, params);
        var result = retry.withOnRetry(event -> LOG.warn(
                        "Retrying Codeforces call method={} attempt={} delayMs={} code={}",
                        method, event.attempt(), event.delayMs(), codeOf(event.error())))
                .call(attempt -> queue.submit(() -> fetch(url)));
        return mapper.convertValue(result, type);
    }

    private JsonNode fetch(URI url) {
        return http.call(client -> client.get().uri(url).exchange((request, response) -> CfRequest.parse(
                response.getStatusCode().value(),
                new String(response.getBody().readAllBytes(), StandardCharsets.UTF_8), mapper)));
    }

    private static String codeOf(RuntimeException error) {
        return error instanceof AppException app ? app.code().name() : error.getClass().getSimpleName();
    }
}
