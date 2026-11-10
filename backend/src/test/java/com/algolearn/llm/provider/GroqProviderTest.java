package com.algolearn.llm.provider;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.equalToJson;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.llm.LlmFakes;
import com.algolearn.llm.chain.FailureKind;
import com.algolearn.llm.chain.LlmException;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/** Ports the groq part of legacy providers.test.js against WireMock, plus timeout/network mapping. */
class GroqProviderTest {

    @RegisterExtension
    static final WireMockExtension GROQ = WireMockExtension.newInstance().options(wireMockConfig().dynamicPort())
            .build();

    private static LlmHttp http(String baseUrl) {
        return new LlmHttp(LlmHttp.client(RestClient.builder(), baseUrl), LlmFakes.MAPPER, "Groq");
    }

    private static LlmProvider provider(LlmHttp http) {
        return GroqProvider.create(http, Optional.of("secret"), Optional.of("llama")).orElseThrow();
    }

    @Test
    void isDisabledWithoutAKeyOrAModel() {
        assertThat(GroqProvider.create(http(GROQ.baseUrl()), Optional.empty(), Optional.of("m"))).isEmpty();
        assertThat(GroqProvider.create(http(GROQ.baseUrl()), Optional.of("k"), Optional.empty())).isEmpty();
        assertThat(GroqProvider.create(http(GROQ.baseUrl()), Optional.of("k"), Optional.of(""))).isEmpty();
    }

    @Test
    void postsAJsonModeChatCompletionAndReturnsTheContent() {
        GROQ.stubFor(post(urlEqualTo(GroqProvider.CHAT_PATH))
                .willReturn(okJson("{\"choices\":[{\"message\":{\"content\":\"{\\\"a\\\":1}\"}}]}")));
        var groq = provider(http(GROQ.baseUrl()));
        assertThat(groq.name()).isEqualTo("groq");
        assertThat(groq.model()).isEqualTo("llama");
        assertThat(groq.readsImages()).isFalse();
        assertThat(groq.generateJson("P")).isEqualTo("{\"a\":1}");
        GROQ.verify(postRequestedFor(urlEqualTo(GroqProvider.CHAT_PATH))
                .withHeader("Authorization", equalTo("Bearer secret"))
                .withRequestBody(equalToJson("{\"model\":\"llama\",\"temperature\":0.2,\"response_format\":"
                        + "{\"type\":\"json_object\"},\"messages\":[{\"role\":\"system\",\"content\":\""
                        + GroqProvider.SYSTEM + "\"},{\"role\":\"user\",\"content\":\"P\"}]}")));
    }

    @Test
    void throwsAnLlmExceptionWithTheHttpStatusOnNon2xx() {
        GROQ.stubFor(post(urlEqualTo(GroqProvider.CHAT_PATH)).willReturn(aResponse().withStatus(429).withBody("{}")));
        var error = catchThrowableOfType(LlmException.class, () -> provider(http(GROQ.baseUrl())).generateJson("P"));
        assertThat(error.status()).isEqualTo(429);
        assertThat(error).hasMessage("Groq answered HTTP 429");
    }

    @Test
    void returnsAnEmptyStringWhenThereIsNoChoice() {
        GROQ.stubFor(post(urlEqualTo(GroqProvider.CHAT_PATH)).willReturn(okJson("{\"choices\":[]}")));
        assertThat(provider(http(GROQ.baseUrl())).generateJson("P")).isEmpty();
        GROQ.stubFor(post(urlEqualTo(GroqProvider.CHAT_PATH)).willReturn(aResponse().withStatus(200)));
        assertThat(provider(http(GROQ.baseUrl())).generateJson("P")).isEmpty();
    }

    @Test
    void aSlowAnswerIsATimeoutTheChainTreatsAsSick() {
        GROQ.stubFor(post(urlEqualTo(GroqProvider.CHAT_PATH)).willReturn(okJson("{}").withFixedDelay(2_000)));
        var factory = new JdkClientHttpRequestFactory(HttpClient.newHttpClient());
        factory.setReadTimeout(Duration.ofMillis(100));
        var client = RestClient.builder().baseUrl(GROQ.baseUrl()).requestFactory(factory).build();
        var error = catchThrowableOfType(LlmException.class,
                () -> provider(new LlmHttp(client, LlmFakes.MAPPER, "Groq")).generateJson("P"));
        assertThat(error.isTimeout()).isTrue();
        assertThat(FailureKind.of(error)).isEqualTo(FailureKind.SICK);
    }

    @Test
    void anUnreachableHostIsANetworkFailure() {
        var error = catchThrowableOfType(LlmException.class,
                () -> provider(http("http://127.0.0.1:1")).generateJson("P"));
        assertThat(error.reason()).isEqualTo("network");
        assertThat(FailureKind.of(error)).isEqualTo(FailureKind.FAIL);
    }
}
