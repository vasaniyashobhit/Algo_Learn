package com.algolearn.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** One line per request: method, path (never the query string), status, duration and request id. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger LOG = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final long NANOS_PER_MILLI = 1_000_000L;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var start = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } finally {
            var millis = (System.nanoTime() - start) / NANOS_PER_MILLI;
            LOG.info("{} {} {} {}ms [requestId={}]", request.getMethod(), request.getRequestURI(),
                    response.getStatus(), millis, RequestIdFilter.currentId(request));
        }
    }
}
