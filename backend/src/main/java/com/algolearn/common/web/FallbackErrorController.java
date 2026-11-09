package com.algolearn.common.web;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import com.algolearn.common.error.PayloadException;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Last resort for errors the container itself forwards to /error (e.g. a sendError outside
 * Spring MVC). It throws, so the GlobalExceptionHandler still writes the response.
 */
@RestController
public class FallbackErrorController implements ErrorController {

    @RequestMapping("/error")
    public void error(HttpServletRequest request) {
        if (request.getAttribute(RequestDispatcher.ERROR_EXCEPTION) instanceof Throwable cause) {
            throw cause instanceof RuntimeException runtime ? runtime : new IllegalStateException(cause);
        }
        throw fromStatus(request);
    }

    static AppException fromStatus(HttpServletRequest request) {
        var status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE) instanceof Integer code ? code : 500;
        var uri = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI) instanceof String path
                ? path : request.getRequestURI();
        return switch (status) {
            case 404, 405 -> new NotFoundException(ErrorCode.ROUTE_NOT_FOUND,
                    "Route %s %s not found".formatted(request.getMethod(), uri));
            case 413 -> new PayloadException(ErrorCode.FILE_TOO_LARGE, "Request body is too large");
            default -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR,
                    "Something went wrong on our side", null, null);
        };
    }
}
