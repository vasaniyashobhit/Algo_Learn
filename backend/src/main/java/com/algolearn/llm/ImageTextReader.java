package com.algolearn.llm;

import com.algolearn.llm.chain.CallOutcome.Failed;
import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.llm.chain.LlmException;
import com.algolearn.llm.chain.ProviderCall;
import com.algolearn.llm.provider.LlmProvider;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * {@link #extractImageText} (legacy imageText.js): tries every provider that can read images (Gemini models)
 * with the same retry/budget/breaker rules as the coach, and stops once the deadline passes. Never throws:
 * empty lets the caller fall back to OCR or ask the user for text.
 */
public class ImageTextReader {

    private final List<LlmProvider> readers;
    private final ChainSettings settings;

    public ImageTextReader(List<LlmProvider> providers, ChainSettings settings) {
        this.readers = providers.stream().filter(LlmProvider::readsImages).toList();
        this.settings = settings;
    }

    /** {@code deadline} null = now + {@link LlmConstants#DEADLINE_MS}. */
    public Optional<ImageText> extractImageText(byte[] image, String mimeType, Instant deadline) {
        if (image == null || image.length == 0 || mimeType == null || mimeType.isEmpty()) {
            return Optional.empty();
        }
        var until = deadline == null ? settings.clock().millis() + settings.deadlineMs() : deadline.toEpochMilli();
        for (var provider : readers) {
            var outcome = ProviderCall.call(provider, p -> read(p, image, mimeType), settings, until);
            if (outcome.value() != null) {
                return Optional.of(new ImageText(outcome.value(), provider.name(), provider.model()));
            }
            if (outcome.failed() == Failed.TIMEOUT) {
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    private static String read(LlmProvider provider, byte[] image, String mimeType) {
        var text = provider.extractTextFromImage(image, mimeType);
        if (text == null || text.isEmpty()) {
            throw new LlmException("The model found no text in the image", null, "empty", null);
        }
        return text;
    }
}
