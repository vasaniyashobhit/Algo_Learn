package com.algolearn.common.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.common.error.ErrorResponseWriter;
import com.algolearn.common.error.mapping.ExceptionMapper;
import com.algolearn.common.web.body.JsonBodyFilter;
import com.algolearn.support.TestProperties;
import jakarta.servlet.ServletException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

class FilterUnitsTest {

    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void errorGuardWritesTheRootCauseOfServletExceptions() throws Exception {
        var writer = new ErrorResponseWriter(new ExceptionMapper(List.of()), json, TestProperties.app(true));
        var response = new MockHttpServletResponse();
        var failing = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res)
                    throws ServletException {
                throw new ServletException("wrapped", new IllegalStateException("root"));
            }
        };
        new FilterErrorGuard(writer).doFilter(new MockHttpServletRequest(), response, failing);
        assertThat(response.getStatus()).isEqualTo(500);
        assertThat(response.getContentAsString()).contains("INTERNAL_ERROR");
    }

    @Test
    void jsonBodyFilterReplaysTheCheckedBodyAndSkipsOtherContentTypes() throws Exception {
        var filter = new JsonBodyFilter(json);
        var request = new MockHttpServletRequest("POST", "/api/v1/x");
        request.setContentType("application/json; charset=utf-8");
        request.setContent("{\"a\":1}".getBytes(StandardCharsets.UTF_8));
        var chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        var seen = chain.getRequest();
        assertThat(new String(seen.getInputStream().readAllBytes(), StandardCharsets.UTF_8)).isEqualTo("{\"a\":1}");
        assertThat(seen.getContentLength()).isEqualTo(7);
        assertThat(((jakarta.servlet.http.HttpServletRequest) seen).getReader().readLine()).isEqualTo("{\"a\":1}");
        for (var type : new String[] {null, "text/plain", "not a type"}) {
            var other = new MockHttpServletRequest("POST", "/x");
            other.setContentType(type);
            var otherChain = new MockFilterChain();
            filter.doFilter(other, new MockHttpServletResponse(), otherChain);
            assertThat(otherChain.getRequest()).isSameAs(other);
        }
    }

    @Test
    void jsonBodyFilterAcceptsAnEmptyBody() throws Exception {
        var request = new MockHttpServletRequest("POST", "/x");
        request.setContentType("application/json");
        var chain = new MockFilterChain();
        new JsonBodyFilter(json).doFilter(request, new MockHttpServletResponse(), chain);
        assertThat(chain.getRequest()).isNotNull();
        assertThat(chain.getRequest().getInputStream().isFinished()).isTrue();
        assertThat(chain.getRequest().getInputStream().isReady()).isTrue();
    }

    @Test
    void corsTreatsEveryOptionsRequestAsAPreflight() {
        assertThat(ClientCorsFilter.isPreflight(new MockHttpServletRequest("OPTIONS", "/x"))).isTrue();
        assertThat(ClientCorsFilter.isPreflight(new MockHttpServletRequest("GET", "/x"))).isFalse();
    }
}
