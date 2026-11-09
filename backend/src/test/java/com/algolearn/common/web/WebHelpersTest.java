package com.algolearn.common.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import com.algolearn.common.error.PayloadException;
import jakarta.servlet.RequestDispatcher;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class WebHelpersTest {

    @Test
    void apiResponseWrapsDataAndOptionalMeta() {
        assertThat(ApiResponse.ok("x")).isEqualTo(new ApiResponse<>(true, "x", null));
        assertThat(ApiResponse.ok("x", Map.of("total", 1)).meta()).isEqualTo(Map.of("total", 1));
    }

    @Test
    void isoTimeAlwaysHasThreeFractionDigitsLikeToIsoString() {
        assertThat(IsoTime.format(Instant.parse("2026-10-28T16:41:50Z"))).isEqualTo("2026-10-28T16:41:50.000Z");
        assertThat(IsoTime.format(Instant.parse("2026-10-28T16:41:50.482123Z"))).isEqualTo("2026-10-28T16:41:50.482Z");
    }

    @Test
    void requestIdResolvesSafeIdsOnly() {
        assertThat(RequestIdFilter.resolve("proxy-abc.123")).isEqualTo("proxy-abc.123");
        assertThat(RequestIdFilter.resolve(null)).hasSize(36);
        assertThat(RequestIdFilter.resolve("a b")).hasSize(36);
        assertThat(RequestIdFilter.currentId(new MockHttpServletRequest())).isNull();
    }

    @Test
    void fallbackErrorControllerMapsContainerStatuses() {
        var request = new MockHttpServletRequest("GET", "/error");
        request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 404);
        request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/x");
        assertThat(FallbackErrorController.fromStatus(request)).isInstanceOf(NotFoundException.class)
                .hasMessage("Route GET /api/v1/x not found");
        request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 413);
        assertThat(FallbackErrorController.fromStatus(request)).isInstanceOf(PayloadException.class);
        request.removeAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        assertThat(FallbackErrorController.fromStatus(request).code()).isEqualTo(ErrorCode.INTERNAL_ERROR);
    }

    @Test
    void fallbackErrorControllerRethrowsTheForwardedException() {
        var controller = new FallbackErrorController();
        var request = new MockHttpServletRequest("GET", "/error");
        request.setAttribute(RequestDispatcher.ERROR_EXCEPTION, new IllegalArgumentException("boom"));
        assertThatThrownBy(() -> controller.error(request)).isInstanceOf(IllegalArgumentException.class);
        request.setAttribute(RequestDispatcher.ERROR_EXCEPTION, new java.io.IOException("io"));
        assertThatThrownBy(() -> controller.error(request)).isInstanceOf(IllegalStateException.class);
        request.removeAttribute(RequestDispatcher.ERROR_EXCEPTION);
        request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 405);
        assertThatThrownBy(() -> controller.error(request)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void securityHeadersMatchHelmetDefaults() {
        assertThat(SecurityHeadersFilter.HEADERS).containsEntry("Referrer-Policy", "no-referrer")
                .containsEntry("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
                .containsEntry("X-XSS-Protection", "0").hasSize(12);
        assertThat(SecurityHeadersFilter.CSP).endsWith("upgrade-insecure-requests");
    }
}
