package com.algolearn.problems;

import com.algolearn.common.web.ApiResponse;
import com.algolearn.problems.dto.ProblemDetail;
import com.algolearn.problems.dto.ProblemSummary;
import java.util.List;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public routes: browsing and similar search need no account. */
@RestController
@RequestMapping("/api/v1/problems")
public class ProblemController {

    private final ProblemService service;

    public ProblemController(ProblemService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<ProblemSummary>> list(@RequestParam MultiValueMap<String, String> query) {
        var page = service.list(ListQuery.parse(query));
        return ApiResponse.ok(page.items(), page.meta());
    }

    @GetMapping("/{contestId}/{index}")
    public ApiResponse<ProblemDetail> get(@PathVariable String contestId, @PathVariable String index) {
        return ApiResponse.ok(service.getById(ProblemParams.id(contestId, index)));
    }

    @GetMapping("/{contestId}/{index}/similar")
    public ApiResponse<List<ProblemSummary>> similar(@PathVariable String contestId, @PathVariable String index,
            @RequestParam MultiValueMap<String, String> query) {
        var result = service.findSimilarToProblem(ProblemParams.similar(contestId, index, query));
        return ApiResponse.ok(result.items(), result.meta());
    }
}
