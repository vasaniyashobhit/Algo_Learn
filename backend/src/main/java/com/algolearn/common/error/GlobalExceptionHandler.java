package com.algolearn.common.error;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Every exception thrown in Spring MVC ends here and leaves as the standard error JSON. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private final ErrorResponseWriter writer;

    public GlobalExceptionHandler(ErrorResponseWriter writer) {
        this.writer = writer;
    }

    @ExceptionHandler(Throwable.class)
    public ResponseEntity<ErrorResponse> handle(Throwable error, HttpServletRequest request) {
        return writer.toResponse(error, request);
    }
}
