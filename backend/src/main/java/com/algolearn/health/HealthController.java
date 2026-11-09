package com.algolearn.health;

import com.algolearn.common.web.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/v1/health (liveness) and /api/v1/health/ready (readiness). */
@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final HealthService service;

    public HealthController(HealthService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<HealthSnapshot> health() {
        return ApiResponse.ok(service.health());
    }

    @GetMapping("/ready")
    public ApiResponse<HealthSnapshot> ready() {
        return ApiResponse.ok(service.ready());
    }
}
