package com.algolearn.llm;

import com.algolearn.llm.cache.CoachCache;
import com.algolearn.llm.chain.ChainOrder;
import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.llm.provider.LlmProvider;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * The LLM module (legacy createLlm; no routes): coach answers and image reading over the same providers, in
 * chain order, sharing one per-minute budget and one circuit breaker. Neither method ever throws.
 */
public class Llm {

    private final List<LlmProvider> providers;
    private final CoachService coach;
    private final ImageTextReader images;

    public Llm(List<LlmProvider> providers, CoachCache cache, ChainSettings settings) {
        this.providers = ChainOrder.of(providers);
        this.coach = new CoachService(this.providers, cache, settings);
        this.images = new ImageTextReader(this.providers, settings);
    }

    /**
     * No providers and no cache: the coach always returns the AI_UNAVAILABLE fallback and image reading
     * returns empty (legacy createOfflineLlm).
     */
    public static Llm offline(ChainSettings settings) {
        return new Llm(List.of(), CoachCache.NONE, settings);
    }

    public List<LlmProvider> providers() {
        return providers;
    }

    public CoachResult getCoachAnswer(CoachRequest request) {
        return coach.getCoachAnswer(request);
    }

    public Optional<ImageText> extractImageText(byte[] image, String mimeType, Instant deadline) {
        return images.extractImageText(image, mimeType, deadline);
    }
}
