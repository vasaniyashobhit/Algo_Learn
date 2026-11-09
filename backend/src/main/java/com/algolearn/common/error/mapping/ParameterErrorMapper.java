package com.algolearn.common.error.mapping;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.FieldIssue;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.core.MethodParameter;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Invalid path/query params → 400 VALIDATION_FAILED with {@code params.*} / {@code query.*} fields. */
@Component
@Order(3)
public class ParameterErrorMapper implements ErrorMapper {

    @Override
    public Optional<AppException> map(Throwable error, HttpServletRequest request) {
        return switch (error) {
            case HandlerMethodValidationException e -> Optional.of(BodyErrorMapper.failed(
                    e.getParameterValidationResults().stream().flatMap(r -> issues(r).stream()).toList(), e));
            case MethodArgumentTypeMismatchException e -> Optional.of(BodyErrorMapper.failed(List.of(
                    new FieldIssue(field(e.getParameter(), e.getName()), "Invalid value for " + e.getName())), e));
            case MissingServletRequestParameterException e -> Optional.of(BodyErrorMapper.failed(List.of(
                    new FieldIssue("query." + e.getParameterName(), "Required")), e));
            default -> Optional.empty();
        };
    }

    private static List<FieldIssue> issues(ParameterValidationResult result) {
        var parameter = result.getMethodParameter();
        var field = field(parameter, parameter.getParameterName());
        return result.getResolvableErrors().stream()
                .map(e -> new FieldIssue(field, e.getDefaultMessage())).toList();
    }

    /** Prefix by request part, as the legacy zod mapper did: params.*, body.*, else query.*. */
    static String field(MethodParameter parameter, String name) {
        if (parameter.hasParameterAnnotation(PathVariable.class)) {
            return "params." + name;
        }
        if (parameter.hasParameterAnnotation(RequestBody.class)) {
            return "body";
        }
        return "query." + name;
    }
}
