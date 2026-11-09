package com.algolearn.common.error.mapping;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.FieldIssue;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.mock.web.MockHttpServletRequest;

class BodyErrorMapperTest {

    private final MockHttpServletRequest request = new MockHttpServletRequest();

    @Test
    void constraintViolationsUseThePropertyPath() {
        var violation = mock(ConstraintViolation.class);
        var path = mock(Path.class);
        when(path.toString()).thenReturn("query.k");
        when(violation.getPropertyPath()).thenReturn(path);
        when(violation.getMessage()).thenReturn("must be at most 30");
        var error = new ConstraintViolationException(Set.<ConstraintViolation<?>>of(violation));
        var mapped = new BodyErrorMapper().map(error, request).orElseThrow();
        assertThat(mapped.code()).isEqualTo(ErrorCode.VALIDATION_FAILED);
        assertThat(mapped.details()).isEqualTo(List.of(new FieldIssue("query.k", "must be at most 30")));
    }

    @Test
    void ignoresOtherErrors() {
        assertThat(new BodyErrorMapper().map(new IllegalStateException(), request)).isEmpty();
        assertThat(new ParameterErrorMapper().map(new IllegalStateException(), request)).isEmpty();
    }

    @Test
    void requestBodyParametersArePrefixedBody() throws NoSuchMethodException {
        var method = BodyErrorMapperTest.class.getDeclaredMethod("sample", String.class);
        assertThat(ParameterErrorMapper.field(new MethodParameter(method, 0), "x")).isEqualTo("body");
    }

    @SuppressWarnings("unused")
    private void sample(@org.springframework.web.bind.annotation.RequestBody String body) {
        // only used for its parameter annotation
    }
}
