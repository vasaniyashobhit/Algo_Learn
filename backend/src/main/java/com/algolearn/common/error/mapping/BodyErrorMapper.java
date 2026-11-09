package com.algolearn.common.error.mapping;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.core.annotation.Order;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.stereotype.Component;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;

/** Invalid or unreadable request bodies → 400 VALIDATION_FAILED with {@code body.*} fields. */
@Component
@Order(2)
public class BodyErrorMapper implements ErrorMapper {

    public static ValidationException malformedJson(Throwable cause) {
        return new ValidationException(ErrorCode.VALIDATION_FAILED,
                "Malformed JSON body", List.of(new FieldIssue("body", "Body is not valid JSON")), cause);
    }

    @Override
    public Optional<AppException> map(Throwable error, HttpServletRequest request) {
        return switch (error) {
            case MethodArgumentNotValidException e -> Optional.of(failed(bodyIssues(e.getBindingResult()), e));
            case ConstraintViolationException e -> Optional.of(failed(e.getConstraintViolations().stream()
                    .map(v -> new FieldIssue(v.getPropertyPath().toString(), v.getMessage())).toList(), e));
            case HttpMessageNotReadableException e -> Optional.of(malformedJson(e));
            default -> Optional.empty();
        };
    }

    static ValidationException failed(List<FieldIssue> issues, Throwable cause) {
        return new ValidationException(ErrorCode.VALIDATION_FAILED,
                "Request validation failed", issues, cause);
    }

    private static List<FieldIssue> bodyIssues(BindingResult result) {
        var issues = new ArrayList<FieldIssue>();
        result.getFieldErrors().forEach(e -> issues.add(new FieldIssue("body." + e.getField(), e.getDefaultMessage())));
        result.getGlobalErrors().forEach(e -> issues.add(new FieldIssue("body", e.getDefaultMessage())));
        return issues;
    }
}
