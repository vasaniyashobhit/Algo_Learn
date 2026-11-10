package com.algolearn.common.validation;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.core.MethodParameter;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import tools.jackson.databind.json.JsonMapper;

/**
 * Resolves {@link JsonBody} parameters. Like the legacy JSON body parser: only application/json bodies
 * are parsed (JsonBodyFilter already rejected malformed ones); anything else is "no body".
 */
@Component
public class JsonBodyResolver implements HandlerMethodArgumentResolver {

    private final JsonMapper json;

    public JsonBodyResolver(JsonMapper json) {
        this.json = json;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.getParameterType() == JsonBody.class;
    }

    @Override
    public JsonBody resolveArgument(MethodParameter parameter, ModelAndViewContainer mav,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) throws IOException {
        var request = webRequest.getNativeRequest(HttpServletRequest.class);
        if (request == null || !isJson(request.getContentType())) {
            return new JsonBody(null);
        }
        var text = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        return new JsonBody(text.isBlank() ? null : json.readTree(text));
    }

    static boolean isJson(String contentType) {
        if (contentType == null) {
            return false;
        }
        try {
            return MediaType.APPLICATION_JSON.equalsTypeAndSubtype(MediaType.parseMediaType(contentType));
        } catch (InvalidMediaTypeException e) {
            return false;
        }
    }
}
