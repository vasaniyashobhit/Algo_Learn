package com.algolearn.security;

import com.algolearn.common.error.AuthException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ErrorResponseWriter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * Unauthenticated access to a protected route → 401 in the standard error JSON: the token error the
 * {@link JwtAuthFilter} found (invalid, expired, malformed header), else AUTH_REQUIRED.
 */
@Component
public class JsonAuthEntryPoint implements AuthenticationEntryPoint {

    private final ErrorResponseWriter writer;

    public JsonAuthEntryPoint(ErrorResponseWriter writer) {
        this.writer = writer;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException authException) throws IOException {
        var error = request.getAttribute(JwtAuthFilter.ERROR_ATTRIBUTE) instanceof AuthException found
                ? found
                : new AuthException(ErrorCode.AUTH_REQUIRED, "Authentication required", null, authException);
        writer.write(error, request, response);
    }
}
