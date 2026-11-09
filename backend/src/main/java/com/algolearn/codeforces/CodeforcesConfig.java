package com.algolearn.codeforces;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.http.RateLimitQueue;
import com.algolearn.common.http.Retry;
import com.algolearn.common.http.RetryPolicy;
import com.algolearn.common.http.TimedHttpClient;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/** The one Codeforces client and its shared queue (Codeforces allows 1 call per 2 s). */
@Configuration(proxyBeanMethods = false)
public class CodeforcesConfig {

    /** 2.1 s between call starts leaves a small margin over Codeforces' 2 s rule (tests set 0). */
    public static final long CF_MIN_INTERVAL_MS = 2_100;
    public static final Duration CF_TIMEOUT = Duration.ofSeconds(20);
    /** 2 retries, 1 s base delay (full jitter, x2, 5 s cap). */
    public static final RetryPolicy CF_RETRY = new RetryPolicy(2, 1_000, 5_000, 2);

    @Bean
    RateLimitQueue codeforcesQueue(
            @Value("${algolearn.codeforces.min-interval-ms:" + CF_MIN_INTERVAL_MS + "}") long minIntervalMs) {
        return RateLimitQueue.spacedBy(minIntervalMs);
    }

    @Bean
    CodeforcesClient codeforcesClient(RestClient.Builder builder, RateLimitQueue codeforcesQueue, JsonMapper mapper,
            @Value("${algolearn.codeforces.base-url:" + CfRequest.CF_API_BASE_URL + "}") String baseUrl) {
        var http = new TimedHttpClient(builder, CF_TIMEOUT, ErrorCode.CF_UNAVAILABLE);
        return new RestCodeforcesClient(http, baseUrl, codeforcesQueue, Retry.of(CF_RETRY), mapper);
    }
}
