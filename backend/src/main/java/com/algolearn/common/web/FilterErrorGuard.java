package com.algolearn.common.web;

import com.algolearn.common.error.ErrorResponseWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Errors thrown by servlet filters (body guard, rate limit, security) never reach the
 * {@code @RestControllerAdvice}; this filter sends them through the same ErrorResponseWriter.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class FilterErrorGuard extends OncePerRequestFilter {

    private final ErrorResponseWriter writer;

    public FilterErrorGuard(ErrorResponseWriter writer) {
        this.writer = writer;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException {
        try {
            chain.doFilter(request, response);
        } catch (ServletException | IOException | RuntimeException e) {
            writer.write(unwrap(e), request, response);
        }
    }

    private static Throwable unwrap(Exception error) {
        return error instanceof ServletException servlet && servlet.getRootCause() != null
                ? servlet.getRootCause()
                : error;
    }
}
