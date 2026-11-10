package com.algolearn.llm.provider;

/**
 * One model of one provider. Calls throw on failure (an {@code LlmException} with the HTTP status, or a
 * timeout); the chain decides what to do with them. Time limits come from the chain's TimeLimiter.
 */
public interface LlmProvider {

    /** {@code gemini} or {@code groq}. */
    String name();

    String model();

    /** The model's raw text answer to a JSON-mode prompt ('' when it sent no text). */
    String generateJson(String prompt);

    /** Whether {@link #extractTextFromImage} is supported (Gemini only). */
    default boolean readsImages() {
        return false;
    }

    /** The trimmed text of a problem screenshot ('' when none). */
    default String extractTextFromImage(byte[] image, String mimeType) {
        throw new UnsupportedOperationException(name() + " cannot read images");
    }
}
