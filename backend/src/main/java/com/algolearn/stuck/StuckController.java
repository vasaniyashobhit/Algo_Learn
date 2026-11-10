package com.algolearn.stuck;

import com.algolearn.common.validation.JsonBody;
import com.algolearn.common.web.ApiResponse;
import com.algolearn.security.AuthUser;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Every /stuck route is protected. POST is limited per user before the upload is read (StuckRateLimitFilter),
 * then the multipart file or JSON body is read and validated.
 */
@RestController
@RequestMapping("/api/v1/stuck")
public class StuckController {

    private final StuckService service;
    private final StuckQueries queries;

    public StuckController(StuckService service, StuckQueries queries) {
        this.service = service;
        this.queries = queries;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<StuckView.Response> solve(@AuthenticationPrincipal AuthUser user, HttpServletRequest request,
            JsonBody body) throws IOException, ServletException {
        return ApiResponse.ok(service.solve(user.id(), StuckRequests.read(request, body)));
    }

    @GetMapping("/history")
    public ApiResponse<List<StuckView.HistoryItem>> history(@AuthenticationPrincipal AuthUser user,
            @RequestParam MultiValueMap<String, String> query) {
        var page = queries.history(user.id(), StuckRequests.page(query));
        return ApiResponse.ok(page.items(), page.meta());
    }

    @GetMapping("/{id}")
    public ApiResponse<StuckView.Response> get(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return ApiResponse.ok(queries.get(user.id(), id));
    }

    @GetMapping("/{id}/solution")
    public ApiResponse<StuckQueries.SolutionView> solution(@AuthenticationPrincipal AuthUser user,
            @PathVariable String id) {
        return ApiResponse.ok(queries.solution(user.id(), id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<StuckQueries.Deleted> remove(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return ApiResponse.ok(queries.remove(user.id(), id));
    }
}
