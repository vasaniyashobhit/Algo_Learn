package com.algolearn.common.error;

import com.algolearn.common.error.mapping.ExceptionMapper;
import com.algolearn.common.web.RequestIdFilter;
import com.algolearn.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * The one place that turns an error into the standard error JSON. Used by the
 * GlobalExceptionHandler, the security entry point and the servlet filters. Logs every error
 * (5xx at error with the stack, 4xx at warn) and never sends a stack in production.
 */
@Component
public class ErrorResponseWriter {

    private static final Logger LOG = LoggerFactory.getLogger(ErrorResponseWriter.class);

    private final ExceptionMapper mapper;
    private final JsonMapper json;
    private final boolean production;

    public ErrorResponseWriter(ExceptionMapper mapper, JsonMapper json, AppProperties properties) {
        this.mapper = mapper;
        this.json = json;
        this.production = properties.production();
    }

    public ResponseEntity<ErrorResponse> toResponse(Throwable error, HttpServletRequest request) {
        var app = mapper.toAppException(error, request);
        var requestId = RequestIdFilter.currentId(request);
        log(app, error, requestId);
        var stack = production ? null : stackOf(error);
        var body = ErrorResponse.of(app.code(), app.getMessage(), app.details(), requestId, stack);
        return ResponseEntity.status(app.status()).contentType(MediaType.APPLICATION_JSON).body(body);
    }

    /** For code outside Spring MVC (filters, security). Does nothing once the response is committed. */
    public void write(Throwable error, HttpServletRequest request, HttpServletResponse response) throws IOException {
        var entity = toResponse(error, request);
        if (response.isCommitted()) {
            return;
        }
        response.resetBuffer();
        response.setStatus(entity.getStatusCode().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getOutputStream(), entity.getBody());
    }

    private static void log(AppException app, Throwable error, String requestId) {
        if (app.status().is5xxServerError()) {
            LOG.error("{} [code={}, requestId={}]", app.getMessage(), app.code(), requestId, error);
        } else {
            LOG.warn("{} [code={}, requestId={}]", app.getMessage(), app.code(), requestId);
        }
    }

    private static String stackOf(Throwable error) {
        var out = new StringWriter();
        error.printStackTrace(new PrintWriter(out));
        return out.toString();
    }
}
