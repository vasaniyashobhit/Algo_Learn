package com.algolearn.common.web;

import com.algolearn.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * CORS limited to CLIENT_URL, the same way the legacy {@code cors({ origin, credentials })} did:
 * the allowed origin is always CLIENT_URL (other origins are not echoed, so browsers block them),
 * credentials are allowed, X-Request-Id is exposed, and preflights are answered with 204.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 4)
public class ClientCorsFilter extends OncePerRequestFilter {

    static final String METHODS = "GET,HEAD,PUT,PATCH,POST,DELETE";

    private final String clientUrl;

    public ClientCorsFilter(AppProperties properties) {
        this.clientUrl = properties.clientUrl();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, clientUrl);
        response.addHeader(HttpHeaders.VARY, HttpHeaders.ORIGIN);
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
        if (!isPreflight(request)) {
            response.setHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, RequestIdFilter.HEADER);
            chain.doFilter(request, response);
            return;
        }
        response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, METHODS);
        var requested = request.getHeader(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS);
        if (requested != null) {
            response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, requested);
            response.addHeader(HttpHeaders.VARY, HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS);
        }
        response.setContentLength(0);
        response.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }

    static boolean isPreflight(HttpServletRequest request) {
        return "OPTIONS".equals(request.getMethod());
    }
}
