package com.algolearn.codeforces;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/** The one shared queue spaces calls 2.1 s apart and the client is the RestClient implementation. */
class CodeforcesConfigTest {

    private final CodeforcesConfig config = new CodeforcesConfig();

    @Test
    void createsTheSharedQueueAndTheRealClient() {
        var queue = config.codeforcesQueue();
        assertThat(queue.intervalMs()).isEqualTo(2_100);
        var client = config.codeforcesClient(RestClient.builder(), queue, JsonMapper.builder().build(),
                CfRequest.CF_API_BASE_URL);
        assertThat(client).isInstanceOf(RestCodeforcesClient.class);
    }
}
