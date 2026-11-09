package com.algolearn.common.error;

/**
 * Machine-readable error codes. Must match the table in docs/API.md exactly (a test checks it)
 * and frontend/src/errors/codes.js.
 */
public enum ErrorCode {
    VALIDATION_FAILED,
    AUTH_REQUIRED,
    AUTH_INVALID_TOKEN,
    AUTH_TOKEN_EXPIRED,
    AUTH_INVALID_CREDENTIALS,
    AUTH_EMAIL_TAKEN,
    FORBIDDEN,
    ROUTE_NOT_FOUND,
    NOT_FOUND,
    PROBLEM_NOT_FOUND,
    CF_HANDLE_NOT_FOUND,
    CF_HANDLE_TAKEN,
    CF_HANDLE_NOT_LINKED,
    CF_UNAVAILABLE,
    SYNC_IN_PROGRESS,
    RATE_LIMITED,
    FILE_TOO_LARGE,
    FILE_TYPE_UNSUPPORTED,
    URL_NOT_ALLOWED,
    URL_FETCH_FAILED,
    INPUT_UNREADABLE,
    PROBLEM_TEXT_TOO_SHORT,
    PRACTICE_ITEM_EXISTS,
    STUCK_QUERY_NOT_FOUND,
    DUPLICATE_RESOURCE,
    DB_UNAVAILABLE,
    INTERNAL_ERROR
}
