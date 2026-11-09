package com.algolearn.common.error;

/** One validation problem: {@code { "field": "body.email", "message": "..." }}. */
public record FieldIssue(String field, String message) {
}
