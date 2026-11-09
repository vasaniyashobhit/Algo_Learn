package com.algolearn.common.error.mapping;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.HttpRequestMethodNotSupportedException;

class ExceptionMapperTest {

    private final ExceptionMapper mapper = new ExceptionMapper(List.of(new RouteErrorMapper(), new BodyErrorMapper()));
    private final MockHttpServletRequest request = new MockHttpServletRequest("DELETE", "/api/v1/health");

    @Test
    void returnsAppExceptionsUnchanged() {
        var error = new NotFoundException();
        assertThat(mapper.toAppException(error, request)).isSameAs(error);
    }

    @Test
    void usesTheFirstMatchingMapper() {
        var mapped = mapper.toAppException(new HttpRequestMethodNotSupportedException("DELETE"), request);
        assertThat(mapped.code()).isEqualTo(ErrorCode.ROUTE_NOT_FOUND);
        assertThat(mapped.getMessage()).isEqualTo("Route DELETE /api/v1/health not found");
    }

    @Test
    void unknownErrorsBecome500InternalErrorWithAGenericMessageAndTheCause() {
        var cause = new IllegalStateException("secret detail");
        var mapped = mapper.toAppException(cause, request);
        assertThat(mapped.status().value()).isEqualTo(500);
        assertThat(mapped.code()).isEqualTo(ErrorCode.INTERNAL_ERROR);
        assertThat(mapped.getMessage()).isEqualTo(ExceptionMapper.GENERIC_MESSAGE);
        assertThat(mapped.getCause()).isSameAs(cause);
    }
}
