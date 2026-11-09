package com.algolearn.common.web;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Success envelope: {@code { "success": true, "data": ..., "meta": { ... } }} ({@code meta} optional). */
public record ApiResponse<T>(
        boolean success,
        @JsonInclude(JsonInclude.Include.ALWAYS) T data,
        @JsonInclude(JsonInclude.Include.NON_NULL) Object meta) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static <T> ApiResponse<T> ok(T data, Object meta) {
        return new ApiResponse<>(true, data, meta);
    }
}
