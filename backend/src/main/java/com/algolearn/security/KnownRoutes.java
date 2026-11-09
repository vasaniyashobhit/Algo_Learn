package com.algolearn.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.function.Supplier;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.util.ServletRequestPathUtils;

/**
 * Matches requests that some controller method handles (path and method). Used to let unknown
 * routes through security so they answer 404 ROUTE_NOT_FOUND instead of 401, like the legacy API.
 * The handler mapping is looked up lazily (it is created after the security configuration).
 */
public class KnownRoutes implements RequestMatcher {

    private final Supplier<RequestMappingHandlerMapping> mapping;

    public KnownRoutes(Supplier<RequestMappingHandlerMapping> mapping) {
        this.mapping = mapping;
    }

    @Override
    public boolean matches(HttpServletRequest request) {
        var previous = request.getAttribute(ServletRequestPathUtils.PATH_ATTRIBUTE);
        ServletRequestPathUtils.parseAndCache(request);
        try {
            return mapping.get().getHandler(request) != null;
        } catch (HttpRequestMethodNotSupportedException e) {
            return false;
        } catch (Exception e) {
            return true; // the path matched but something else did not (e.g. media type): a real route
        } finally {
            request.setAttribute(ServletRequestPathUtils.PATH_ATTRIBUTE, previous);
        }
    }
}
