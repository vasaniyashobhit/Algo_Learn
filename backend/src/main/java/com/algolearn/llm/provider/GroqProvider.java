package com.algolearn.llm.provider;

import com.algolearn.llm.LlmConstants;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Groq's OpenAI-compatible chat completions in JSON mode. Exists only when both the key and the model are
 * configured ({@link #create}). Non-2xx answers throw an LlmException with the HTTP status.
 */
public final class GroqProvider implements LlmProvider {

    public static final String NAME = "groq";
    public static final String BASE_URL = "https://api.groq.com";
    public static final String CHAT_PATH = "/openai/v1/chat/completions";
    static final String SYSTEM = "You are a competitive programming coach. Always answer with a single JSON object.";

    private final LlmHttp http;
    private final String apiKey;
    private final String model;

    private GroqProvider(LlmHttp http, String apiKey, String model) {
        this.http = http;
        this.apiKey = apiKey;
        this.model = model;
    }

    /** Empty (provider disabled) when the key or the model is missing or blank. */
    public static Optional<LlmProvider> create(LlmHttp http, Optional<String> apiKey, Optional<String> model) {
        var key = apiKey.filter(k -> !k.isBlank());
        var name = model.filter(m -> !m.isBlank());
        return key.isPresent() && name.isPresent()
                ? Optional.of(new GroqProvider(http, key.get(), name.get())) : Optional.empty();
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
        var body = Map.of(
                "model", model,
                "temperature", LlmConstants.TEMPERATURE,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(Map.of("role", "system", "content", SYSTEM),
                        Map.of("role", "user", "content", prompt)));
        var answer = http.post(CHAT_PATH, headers -> headers.setBearerAuth(apiKey), body);
        var content = answer.path("choices").path(0).path("message").path("content");
        return content.isString() ? content.stringValue() : "";
    }
}
