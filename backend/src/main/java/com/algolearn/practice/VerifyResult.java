package com.algolearn.practice;

import com.fasterxml.jackson.annotation.JsonInclude;

/** {@code { verified: true, item }} or {@code { verified: false, reason }}. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record VerifyResult(boolean verified, PracticeItemView item, String reason) {

    public static VerifyResult solved(PracticeItemView item) {
        return new VerifyResult(true, item, null);
    }

    public static VerifyResult notSolved(String reason) {
        return new VerifyResult(false, null, reason);
    }
}
