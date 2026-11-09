package com.algolearn.common.error.mapping;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import com.algolearn.common.error.PayloadException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Unknown path or method → 404 ROUTE_NOT_FOUND (like the legacy notFound); oversized upload → 413. */
@Component
@Order(1)
public class RouteErrorMapper implements ErrorMapper {

    public static NotFoundException routeNotFound(HttpServletRequest request) {
        return new NotFoundException(ErrorCode.ROUTE_NOT_FOUND,
                "Route %s %s not found".formatted(request.getMethod(), request.getRequestURI()));
    }

    @Override
    public Optional<AppException> map(Throwable error, HttpServletRequest request) {
        return switch (error) {
            case NoHandlerFoundException e -> Optional.of(routeNotFound(request));
            case NoResourceFoundException e -> Optional.of(routeNotFound(request));
            case HttpRequestMethodNotSupportedException e -> Optional.of(routeNotFound(request));
            case MaxUploadSizeExceededException e -> Optional.of(
                    new PayloadException(ErrorCode.FILE_TOO_LARGE, "The uploaded file is too large", null, e));
            default -> Optional.empty();
        };
    }
}
