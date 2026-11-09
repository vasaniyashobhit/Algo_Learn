package com.algolearn.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.common.error.ErrorResponseWriter;
import com.algolearn.common.error.mapping.ExceptionMapper;
import com.algolearn.common.web.RequestIdFilter;
import com.algolearn.support.TestProperties;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import tools.jackson.databind.json.JsonMapper;

class SecurityHandlersTest {

    private final ErrorResponseWriter writer = new ErrorResponseWriter(new ExceptionMapper(List.of()),
            JsonMapper.builder().build(), TestProperties.app(true));

    private static MockHttpServletRequest request() {
        var request = new MockHttpServletRequest("GET", "/api/v1/users/me");
        request.setAttribute(RequestIdFilter.ATTRIBUTE, "req-9");
        return request;
    }

    @Test
    void entryPointWritesAuthRequiredInTheStandardShape() throws Exception {
        var response = new MockHttpServletResponse();
        new JsonAuthEntryPoint(writer).commence(request(), response, new InsufficientAuthenticationException("no"));
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).isEqualTo("{\"success\":false,\"error\":{\"code\":\"AUTH_REQUIRED\","
                + "\"message\":\"Authentication required\",\"details\":null,\"requestId\":\"req-9\"}}");
    }

    @Test
    void entryPointWritesTheTokenErrorTheFilterFound() throws Exception {
        var request = request();
        request.setAttribute(JwtAuthFilter.ERROR_ATTRIBUTE, new com.algolearn.common.error.AuthException(
                com.algolearn.common.error.ErrorCode.AUTH_TOKEN_EXPIRED, "Your session has expired"));
        var response = new MockHttpServletResponse();
        new JsonAuthEntryPoint(writer).commence(request, response, new InsufficientAuthenticationException("no"));
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("\"code\":\"AUTH_TOKEN_EXPIRED\"");
    }

    @Test
    void knownRoutesTreatAFailedLookupAfterAPathMatchAsARealRoute() {
        var routes = new KnownRoutes(() -> {
            throw new IllegalStateException("media type");
        });
        assertThat(routes.matches(request())).isTrue();
    }

    @Test
    void accessDeniedHandlerWritesForbidden() throws Exception {
        var response = new MockHttpServletResponse();
        new JsonAccessDeniedHandler(writer).handle(request(), response, new AccessDeniedException("no"));
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("\"code\":\"FORBIDDEN\"");
    }

    @Test
    void thereIsNoDefaultUser() {
        var users = new SecurityConfig().noUsers();
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> users.loadUserByUsername("user"))
                .isInstanceOf(UsernameNotFoundException.class);
    }
}
