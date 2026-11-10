package com.algolearn.llm;

import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.llm.chain.ProviderCall;
import com.algolearn.llm.provider.LlmProvider;
import com.algolearn.llm.schema.CoachResponseParser;
import com.algolearn.llm.schema.CppCheck;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Session 7 decision (not legacy): an answer whose {@code code} fails {@link CppCheck} is asked for once more from the
 * same model, with an instruction for a valid C++17 program. If the second answer is still malformed (or the call
 * fails), the first answer is kept with {@code code} null: the hints and steps stay useful, broken code is never
 * shown or cached.
 */
final class CodeRepair {

    static final String INSTRUCTION = String.join("\n",
            "",
            "IMPORTANT: the \"code\" field of your previous answer was not a valid C++17 program.",
            "Answer again with the same JSON shape. \"code\" must be a complete C++17 program that starts with the",
            "standard #include lines it needs (e.g. #include <bits/stdc++.h>), uses no other lines starting with #",
            "than #include, #define, #pragma, #if, #ifdef, #ifndef, #else, #elif or #endif, reads stdin and writes",
            "stdout.");
    private static final Logger LOG = LoggerFactory.getLogger(CodeRepair.class);

    private CodeRepair() {
    }

    static CoachAnswer ensureValidCode(LlmProvider provider, CoachAnswer answer, String prompt, ChainSettings settings,
            long deadline) {
        if (CppCheck.isWellFormed(answer.code())) {
            return answer;
        }
        LOG.warn("LLM answer has malformed C++ code, asking once more (provider={}, model={})", provider.name(),
                provider.model());
        var retry = ProviderCall.call(provider, p -> CoachResponseParser.parse(p.generateJson(prompt + INSTRUCTION)),
                settings, deadline);
        if (retry.value() != null && CppCheck.isWellFormed(retry.value().code())) {
            return retry.value();
        }
        LOG.warn("LLM code still malformed, keeping the steps without code (provider={}, model={})", provider.name(),
                provider.model());
        return answer.withCode(null);
    }
}
