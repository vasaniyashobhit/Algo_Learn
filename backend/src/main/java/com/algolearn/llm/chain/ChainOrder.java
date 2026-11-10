package com.algolearn.llm.chain;

import com.algolearn.llm.provider.LlmProvider;
import java.util.ArrayList;
import java.util.List;

/**
 * Order in which the chain tries providers: the first Gemini model, then the other providers (Groq is fast),
 * then the remaining Gemini models. Pure; keeps the order within each group.
 */
public final class ChainOrder {

    private static final String GEMINI = "gemini";

    private ChainOrder() {
    }

    public static List<LlmProvider> of(List<LlmProvider> providers) {
        var gemini = providers.stream().filter(p -> GEMINI.equals(p.name())).toList();
        var ordered = new ArrayList<LlmProvider>(gemini.stream().limit(1).toList());
        ordered.addAll(providers.stream().filter(p -> !GEMINI.equals(p.name())).toList());
        ordered.addAll(gemini.stream().skip(1).toList());
        return List.copyOf(ordered);
    }
}
