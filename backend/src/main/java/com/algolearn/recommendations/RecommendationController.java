package com.algolearn.recommendations;

import com.algolearn.common.web.ApiResponse;
import com.algolearn.recommendations.dto.Recommendations;
import com.algolearn.security.AuthUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /recommendations (protected). */
@RestController
public class RecommendationController {

    private final RecommendationService service;

    public RecommendationController(RecommendationService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/recommendations")
    public ApiResponse<Recommendations.Data> getRecommendations(@AuthenticationPrincipal AuthUser user) {
        var result = service.getRecommendations(user.id());
        return ApiResponse.ok(result.data(), result.meta());
    }
}
