package com.algolearn.stats;

import com.algolearn.common.web.ApiResponse;
import com.algolearn.security.AuthUser;
import com.algolearn.stats.dto.Summary;
import com.algolearn.stats.dto.TopicStatView;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** GET /users/me/stats and /users/me/stats/summary (protected). */
@RestController
@RequestMapping("/api/v1/users/me/stats")
public class StatsController {

    private final StatsService service;

    public StatsController(StatsService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<TopicStatView>> getMyStats(@AuthenticationPrincipal AuthUser user,
            @RequestParam MultiValueMap<String, String> query) {
        var page = service.getStats(user.id(), StatsQuery.parse(query));
        return ApiResponse.ok(page.items(), page.meta());
    }

    @GetMapping("/summary")
    public ApiResponse<Summary> getMySummary(@AuthenticationPrincipal AuthUser user) {
        var page = service.getSummary(user.id());
        return ApiResponse.ok(page.data(), page.meta());
    }
}
