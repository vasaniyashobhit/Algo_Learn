package com.algolearn.llm;

import static com.algolearn.llm.LlmFakes.coachJson;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.schema.CppCheck;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Session 7 decision: malformed C++ is asked for once more, then cached without code. */
class CodeRepairTest {

    private static final String BAD = "# Solution\nint main() {}";
    private final LlmFakes.FakeCache cache = new LlmFakes.FakeCache();

    private CoachResult answer(FakeProvider provider) {
        var service = new CoachService(java.util.List.of(provider), cache, LlmFakes.settings(LlmFakes.clockAt(0)));
        return service.getCoachAnswer(CoachRequest.ofText("A long enough statement about squares."));
    }

    @ParameterizedTest
    @ValueSource(strings = {"#include <bits/stdc++.h>\nint main() {}", "  #include <cstdio>\n#define X 1\n#pragma once"
            + "\n#if A\n#ifdef B\n#ifndef C\n#else\n#elif D\n#endif\nint main(){}", "# include <cstdio>\nint main(){}"})
    void acceptsProgramsWithIncludesAndKnownDirectives(String code) {
        assertThat(CppCheck.isWellFormed(code)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"int main() {}", "#include <cstdio>\n# Solution", "#iostream>\nint main(", "  ", "#"})
    void refusesProgramsWithoutIncludesOrWithStrayHashLines(String code) {
        assertThat(CppCheck.isWellFormed(code)).isFalse();
        assertThat(CppCheck.isWellFormed(null)).isFalse();
    }

    @Test
    void keepsAValidProgramWithoutAnExtraCall() {
        var provider = FakeProvider.of("gemini", "a", coachJson());
        assertThat(answer(provider).answer().code()).isEqualTo(LlmFakes.CODE);
        assertThat(provider.jsonCalls).isEqualTo(1);
    }

    @Test
    void asksOnceMoreAndUsesTheRepairedAnswer() {
        var provider = FakeProvider.of("gemini", "a", coachJson(Map.of("code", BAD)), coachJson());
        var result = answer(provider);
        assertThat(result.answer().code()).isEqualTo(LlmFakes.CODE);
        assertThat(provider.jsonCalls).isEqualTo(2);
        assertThat(provider.prompts.get(1)).endsWith(CodeRepair.INSTRUCTION);
        assertThat(cache.store.values()).singleElement().satisfies(c -> assertThat(c.answer().code())
                .isEqualTo(LlmFakes.CODE));
    }

    @Test
    void keepsTheStepsWithCodeNullWhenTheSecondAnswerIsStillMalformedOrFails() {
        var stillBad = FakeProvider.of("gemini", "a", coachJson(Map.of("code", BAD)));
        var result = answer(stillBad);
        assertThat(result.answer().code()).isNull();
        assertThat(result.answer().solutionSteps()).isNotEmpty();
        assertThat(cache.store.values()).singleElement().satisfies(c -> assertThat(c.answer().code()).isNull());
        var failing = FakeProvider.of("gemini", "b", coachJson(Map.of("code", "")), "not json");
        assertThat(answer(failing).answer().code()).isNull();
    }

    @Test
    void parsesACachedNullCodeAsNull() {
        var answer = com.algolearn.llm.schema.CoachResponseParser.parse(coachJson(java.util.Collections
                .singletonMap("code", null)));
        assertThat(answer.code()).isNull();
    }
}
