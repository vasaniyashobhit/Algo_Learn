package com.algolearn.security;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ErrorResponseWriter;
import com.algolearn.common.error.ForbiddenException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/** Authenticated but not allowed → 403 FORBIDDEN in the standard error JSON. */
@Component
public class JsonAccessDeniedHandler implements AccessDeniedHandler {

    private final ErrorResponseWriter writer;

    public JsonAccessDeniedHandler(ErrorResponseWriter writer) {
        this.writer = writer;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
            AccessDeniedException accessDeniedException) throws IOException {
        var error = new ForbiddenException(ErrorCode.FORBIDDEN, "You cannot access this resource", null,
                accessDeniedException);
        writer.write(error, request, response);
    }
}
