package com.algolearn.common.error.mapping;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ConflictException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Unique violations → 409 by constraint name; lost database connections → 503 DB_UNAVAILABLE. */
@Component
@Order(4)
public class DataErrorMapper implements ErrorMapper {

    private static final Map<String, Conflict> BY_CONSTRAINT = Map.of(
            "uk_users_email", new Conflict(ErrorCode.AUTH_EMAIL_TAKEN, "An account with this email already exists"),
            "uk_users_cf_handle", new Conflict(ErrorCode.CF_HANDLE_TAKEN,
                    "This Codeforces handle is already linked to another account"),
            "uk_practice_user_problem", new Conflict(ErrorCode.PRACTICE_ITEM_EXISTS,
                    "This problem is already in your practice list"));

    @Override
    public Optional<AppException> map(Throwable error, HttpServletRequest request) {
        return switch (error) {
            case DataIntegrityViolationException e -> UniqueViolation.find(e).map(v -> conflict(v, e));
            case DataAccessResourceFailureException e -> Optional.of(new ExternalServiceException(
                    ErrorCode.DB_UNAVAILABLE, "Database is not available", null, HttpStatus.SERVICE_UNAVAILABLE, e));
            default -> Optional.empty();
        };
    }

    private static AppException conflict(UniqueViolation violation, Throwable cause) {
        var known = BY_CONSTRAINT.get(violation.constraint());
        if (known != null) {
            return new ConflictException(known.code(), known.message(), null, cause);
        }
        return new ConflictException(ErrorCode.DUPLICATE_RESOURCE, "This resource already exists",
                Map.of("fields", DuplicateFields.of(violation)), cause);
    }

    private record Conflict(ErrorCode code, String message) {
    }
}
