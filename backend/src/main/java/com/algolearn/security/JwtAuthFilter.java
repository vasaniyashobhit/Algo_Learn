package com.algolearn.security;

import com.algolearn.common.error.AuthException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads the Bearer token, if any. A valid one authenticates the request as {@link AuthUser}; a bad
 * one is remembered on the request so that a protected route answers with that exact error
 * (AUTH_INVALID_TOKEN, AUTH_TOKEN_EXPIRED). Public routes ignore the header, like the legacy API.
 * Created by SecurityConfig only (not a bean, so it is not also registered as a servlet filter).
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String ERROR_ATTRIBUTE = JwtAuthFilter.class.getName() + ".error";

    private final JwtService jwt;

    public JwtAuthFilter(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null) {
            try {
                var user = jwt.verify(BearerToken.read(header));
                var strategy = SecurityContextHolder.getContextHolderStrategy();
                var context = strategy.createEmptyContext();
                context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(user, null, List.of()));
                strategy.setContext(context);
            } catch (AuthException e) {
                request.setAttribute(ERROR_ATTRIBUTE, e);
            }
        }
        chain.doFilter(request, response);
    }
}
