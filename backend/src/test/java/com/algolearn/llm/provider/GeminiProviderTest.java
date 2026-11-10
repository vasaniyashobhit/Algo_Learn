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
import com.algolearn.llm.chain.LlmException;
import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.web.client.RestClient;

/** Ports the gemini part of legacy providers.test.js against WireMock (REST generateContent). */
class GeminiProviderTest {

    @RegisterExtension
    static final WireMockExtension AI = WireMockExtension.newInstance().options(wireMockConfig().dynamicPort()).build();

    private static final String PATH = "/v1beta/models/m:generateContent";

    private GeminiProvider provider() {
        var http = new LlmHttp(LlmHttp.client(RestClient.builder(), AI.baseUrl()), LlmFakes.MAPPER, "Gemini");
        return new GeminiProvider(http, "secret-key", "m");
    }

    private static void answer(String partsJson) {
        AI.stubFor(post(urlEqualTo(PATH)).willReturn(okJson(
                "{\"candidates\":[{\"content\":{\"role\":\"model\",\"parts\":" + partsJson + "}}]}")));
    }

    @Test
    void asksForApplicationJsonWithTheKeyInAHeader() {
        answer("[{\"text\":\"{\\\"ok\\\":1}\"}]");
        assertThat(provider().generateJson("P")).isEqualTo("{\"ok\":1}");
        AI.verify(postRequestedFor(urlEqualTo(PATH)).withHeader("x-goog-api-key", equalTo("secret-key"))
                .withRequestBody(equalToJson("{\"contents\":[{\"role\":\"user\",\"parts\":[{\"text\":\"P\"}]}],"
                        + "\"generationConfig\":{\"responseMimeType\":\"application/json\",\"temperature\":0.2}}")));
        assertThat(provider().name()).isEqualTo("gemini");
        assertThat(provider().model()).isEqualTo("m");
    }

    @Test
    void joinsTextPartsAndSkipsThoughts() {
        answer("[{\"text\":\"plan\",\"thought\":true},{\"text\":\"{\\\"a\\\":\"},{\"text\":\"1}\"}]");
        assertThat(provider().generateJson("P")).isEqualTo("{\"a\":1}");
    }

    @Test
    void returnsAnEmptyStringWhenTheModelSendsNoText() {
        AI.stubFor(post(urlEqualTo(PATH)).willReturn(okJson("{\"promptFeedback\":{\"blockReason\":\"OTHER\"}}")));
        assertThat(provider().generateJson("P")).isEmpty();
        assertThat(provider().extractTextFromImage(new byte[] {1}, "image/png")).isEmpty();
    }

    @Test
    void sendsAScreenshotAsBase64InlineDataAndTrimsTheText() {
        answer("[{\"text\":\"  A. Theatre Square \\n\"}]");
        var png = "png-bytes".getBytes(StandardCharsets.UTF_8);
        assertThat(provider().readsImages()).isTrue();
        assertThat(provider().extractTextFromImage(png, "image/png")).isEqualTo("A. Theatre Square");
        var data = Base64.getEncoder().encodeToString(png);
        AI.verify(postRequestedFor(urlEqualTo(PATH)).withRequestBody(equalToJson("{\"contents\":[{\"role\":\"user\","
                + "\"parts\":[{\"inlineData\":{\"mimeType\":\"image/png\",\"data\":\"" + data + "\"}},"
                + "{\"text\":\"" + GeminiProvider.IMAGE_PROMPT + "\"}]}],\"generationConfig\":{\"temperature\":0}}")));
        assertThat(GeminiProvider.IMAGE_PROMPT).contains("Transcribe all of its text");
    }

    @Test
    void turnsHttpErrorsIntoLlmExceptionsWithTheStatus() {
        AI.stubFor(post(urlEqualTo(PATH)).willReturn(aResponse().withStatus(429).withBody("{\"error\":{}}")));
        var error = catchThrowableOfType(LlmException.class, () -> provider().generateJson("P"));
        assertThat(error.status()).isEqualTo(429);
        assertThat(error).hasMessage("Gemini answered HTTP 429");
    }

    @Test
    void aBodyThatIsNotJsonIsAnInvalidResponse() {
        AI.stubFor(post(urlEqualTo(PATH)).willReturn(aResponse().withStatus(200).withBody("<html>")));
        var error = catchThrowableOfType(LlmException.class, () -> provider().generateJson("P"));
        assertThat(error.reason()).isEqualTo("invalid_response");
    }
}
