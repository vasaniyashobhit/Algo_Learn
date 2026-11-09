package com.algolearn.common.error.mapping;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

class RouteErrorMapperTest {

    private final RouteErrorMapper mapper = new RouteErrorMapper();
    private final MockHttpServletRequest request = new MockHttpServletRequest("POST", "/missing");

    @Test
    void unknownRoutesBecomeRouteNotFoundWithMethodAndPathWithoutQuery() {
        request.setQueryString("token=abc");
        var errors = new Exception[] {
            new NoHandlerFoundException("POST", "/missing", HttpHeaders.EMPTY),
            new NoResourceFoundException(HttpMethod.POST, "/missing", "missing"),
            new HttpRequestMethodNotSupportedException("POST"),
        };
        for (var error : errors) {
            var mapped = mapper.map(error, request).orElseThrow();
            assertThat(mapped.status().value()).isEqualTo(404);
            assertThat(mapped.code()).isEqualTo(ErrorCode.ROUTE_NOT_FOUND);
            assertThat(mapped.getMessage()).isEqualTo("Route POST /missing not found");
        }
    }

    @Test
    void oversizedUploadsBecomeFileTooLarge() {
        var mapped = mapper.map(new MaxUploadSizeExceededException(5), request).orElseThrow();
        assertThat(mapped.status().value()).isEqualTo(413);
        assertThat(mapped.code()).isEqualTo(ErrorCode.FILE_TOO_LARGE);
    }

    @Test
    void ignoresOtherErrors() {
        assertThat(mapper.map(new IllegalStateException(), request)).isEmpty();
    }
}
