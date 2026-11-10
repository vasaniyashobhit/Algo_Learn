package com.algolearn.e2e;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ErrorResponseWriter;
import com.algolearn.common.error.ExternalServiceException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

/**
 * E2E only: {@code GET /api/v1/health} answers 503 until {@link E2eWarmup} has run, so Playwright and the parity
 * check (both wait for a healthy backend) start on a warm JVM. Every other route works during the warm-up.
 */
class E2eReadiness extends OncePerRequestFilter {

    static final String HEALTH = "/api/v1/health";

    private final AtomicBoolean ready = new AtomicBoolean();
    private final ErrorResponseWriter writer;
    private final JsonMapper json;

    E2eReadiness(ErrorResponseWriter writer, JsonMapper json) {
        this.writer = writer;
        this.json = json;
    }

    boolean isReady() {
        return ready.get();
    }

    @EventListener
    void warmUp(ApplicationReadyEvent event) {
        var port = event.getApplicationContext().getEnvironment().getProperty("local.server.port", Integer.class);
        if (port != null) {
            new E2eWarmup(json, port).run();
        }
        ready.set(true);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!ready.get() && HEALTH.equals(request.getRequestURI())) {
            writer.write(new ExternalServiceException(ErrorCode.DB_UNAVAILABLE, "The E2E backend is warming up", null,
                    HttpStatus.SERVICE_UNAVAILABLE, null), request, response);
            return;
        }
        chain.doFilter(request, response);
    }
}
