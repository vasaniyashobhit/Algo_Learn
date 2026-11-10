package com.algolearn.llm.provider;

import com.algolearn.common.validation.JsText;
import com.algolearn.llm.LlmConstants;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import tools.jackson.databind.JsonNode;

/**
 * One Gemini model over the REST API ({@code POST /v1beta/models/<model>:generateContent}, key in the
 * {@code x-goog-api-key} header). JSON mode for the coach; inline base64 data plus a transcription prompt for
 * screenshots. The answer text is every non-thought text part of the first candidate (the SDK's response.text).
 */
public final class GeminiProvider implements LlmProvider {

    public static final String NAME = "gemini";
    public static final String BASE_URL = "https://generativelanguage.googleapis.com";
    static final String IMAGE_PROMPT = String.join(" ",
            "This image is a screenshot of a competitive programming problem.",
            "Transcribe all of its text exactly (statement, input, output, examples, notes).",
            "Write formulas in plain text. Reply with the text only, nothing else.");

    private final LlmHttp http;
    private final String apiKey;
    private final String model;

    public GeminiProvider(LlmHttp http, String apiKey, String model) {
        this.http = http;
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public String name() {
        return NAME;
    }

    @Override
    public String model() {
        return model;
    }

    @Override
    public String generateJson(String prompt) {
        var config = Map.of("responseMimeType", "application/json", "temperature", LlmConstants.TEMPERATURE);
        return generate(List.of(Map.of("text", prompt)), config);
    }

    @Override
    public boolean readsImages() {
        return true;
    }

    @Override
    public String extractTextFromImage(byte[] image, String mimeType) {
        var data = Map.of("mimeType", mimeType, "data", Base64.getEncoder().encodeToString(image));
        var parts = List.<Map<String, Object>>of(Map.of("inlineData", data), Map.of("text", IMAGE_PROMPT));
        return JsText.trim(generate(parts, Map.of("temperature", 0)));
    }

    private String generate(List<? extends Map<String, ?>> parts, Map<String, ?> config) {
        var body = Map.of("contents", List.of(Map.of("role", "user", "parts", parts)), "generationConfig", config);
        var answer = http.post("/v1beta/models/{model}:generateContent".replace("{model}", model),
                headers -> headers.set("x-goog-api-key", apiKey), body);
        return textOf(answer);
    }

    static String textOf(JsonNode answer) {
        var parts = answer.path("candidates").path(0).path("content").path("parts");
        return StreamSupport.stream(parts.spliterator(), false)
                .filter(part -> !part.path("thought").asBoolean(false) && part.path("text").isString())
                .map(part -> part.path("text").stringValue())
                .collect(Collectors.joining());
    }
}
