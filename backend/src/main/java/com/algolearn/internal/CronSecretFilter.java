package com.algolearn.internal;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ForbiddenException;
import com.algolearn.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Every /internal request needs {@code x-cron-secret: <CRON_SECRET>} (legacy requireCronSecret on the
 * whole router), checked in constant time; otherwise 403 FORBIDDEN. The query string never counts.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 8)
public class CronSecretFilter extends OncePerRequestFilter {

    public static final String HEADER = "x-cron-secret";
    static final String PREFIX = "/api/v1/internal/";

    private final String secret;

    public CronSecretFilter(AppProperties properties) {
        this.secret = properties.cronSecret();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        var uri = request.getRequestURI();
        return !(uri.startsWith(PREFIX) || uri.equals("/api/v1/internal"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!secretsMatch(request.getHeader(HEADER), secret)) {
            throw new ForbiddenException(ErrorCode.FORBIDDEN, "Missing or invalid cron secret");
        }
        chain.doFilter(request, response);
    }

    /** Constant-time compare (hashing first gives both sides the same length). */
    static boolean secretsMatch(String given, String expected) {
        return given != null && expected != null && !expected.isEmpty()
                && MessageDigest.isEqual(sha256(given), sha256(expected));
    }

    private static byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
