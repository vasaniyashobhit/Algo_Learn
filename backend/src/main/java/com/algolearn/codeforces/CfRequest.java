package com.algolearn.codeforces;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Builds Codeforces API URLs and turns raw answers into the {@code result} node or a typed error. */
public final class CfRequest {

    public static final String CF_API_BASE_URL = "https://codeforces.com/api";
    private static final int OK_MIN = 200;
    private static final int OK_MAX = 299;

    private CfRequest() {
    }

    /** {@code <base>/<method>?a=1&b=2}: null params are skipped, lists are joined with ";". */
    public static URI buildUrl(String baseUrl, String method, Map<String, ?> params) {
        var url = new StringBuilder(baseUrl.replaceAll("/$", "")).append('/').append(method);
        var query = new StringJoiner("&");
        params.forEach((key, value) -> {
            if (value != null) {
                query.add(encode(key) + "=" + encode(asText(value)));
            }
        });
        if (query.length() > 0) {
            url.append('?').append(query);
        }
        return URI.create(url.toString());
    }

    /**
     * The {@code result} of an OK body, or a typed error. Codeforces reports bad input as HTTP 400
     * with {@code "status": "FAILED"}, so the body is checked before the HTTP status.
     */
    public static JsonNode parse(int status, String body, JsonMapper mapper) {
        JsonNode json = null;
        JacksonException parseError = null;
        try {
            json = mapper.readTree(body);
        } catch (JacksonException e) {
            parseError = e;
        }
        var cfStatus = json == null ? "" : json.path("status").asString("");
        if ("FAILED".equals(cfStatus)) {
            throw CfErrors.failedStatus(json.path("comment").asString(""));
        }
        if (status < OK_MIN || status > OK_MAX) {
            throw CfErrors.httpStatus(status);
        }
        if (parseError != null || !"OK".equals(cfStatus)) {
            throw CfErrors.invalidBody(status, parseError);
        }
        return json.path("result");
    }

    private static String asText(Object value) {
        return value instanceof List<?> list
                ? String.join(";", list.stream().map(String::valueOf).toList())
                : String.valueOf(value);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
