package com.algolearn.common.web.body;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.PayloadException;
import com.algolearn.common.error.mapping.BodyErrorMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Like the legacy JSON body parser (1 MB limit), before routing: a JSON body over 1 MB →
 * 413 FILE_TOO_LARGE; malformed JSON (or a top-level value that is not an object/array) → 400
 * VALIDATION_FAILED on every path, including unknown routes. The checked body is replayed downstream.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class JsonBodyFilter extends OncePerRequestFilter {

    public static final int BODY_LIMIT_BYTES = 1024 * 1024;

    private final JsonMapper json;

    public JsonBodyFilter(JsonMapper json) {
        this.json = json;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        var type = request.getContentType();
        if (type == null) {
            return true;
        }
        try {
            return !MediaType.APPLICATION_JSON.equalsTypeAndSubtype(MediaType.parseMediaType(type));
        } catch (InvalidMediaTypeException e) {
            return true; // an unparseable Content-Type is not JSON; the legacy parser skipped it too
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getContentLengthLong() > BODY_LIMIT_BYTES) {
            throw tooLarge();
        }
        var body = request.getInputStream().readNBytes(BODY_LIMIT_BYTES + 1);
        if (body.length > BODY_LIMIT_BYTES) {
            throw tooLarge();
        }
        check(body);
        chain.doFilter(new CachedBodyRequest(request, body), response);
    }

    private void check(byte[] body) {
        var text = new String(body, StandardCharsets.UTF_8).strip();
        if (text.isEmpty()) {
            return;
        }
        if (text.charAt(0) != '{' && text.charAt(0) != '[') {
            throw BodyErrorMapper.malformedJson(null);
        }
        try {
            json.readTree(text);
        } catch (JacksonException e) {
            throw BodyErrorMapper.malformedJson(e);
        }
    }

    private static PayloadException tooLarge() {
        return new PayloadException(ErrorCode.FILE_TOO_LARGE, "Request body is too large");
    }
}
