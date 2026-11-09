package com.algolearn.practice;

import com.algolearn.common.validation.JsonBody;
import com.algolearn.common.web.ApiResponse;
import com.algolearn.problems.ProblemParams;
import com.algolearn.security.AuthUser;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Every /practice route is protected. A problem id "1/A" is addressed as /practice/1/A. */
@RestController
@RequestMapping("/api/v1/practice")
public class PracticeController {

    private final PracticeService service;
    private final VerifyService verifier;

    public PracticeController(PracticeService service, VerifyService verifier) {
        this.service = service;
        this.verifier = verifier;
    }

    @GetMapping
    public ApiResponse<List<PracticeItemView>> list(@AuthenticationPrincipal AuthUser user,
            @RequestParam MultiValueMap<String, String> query) {
        var page = service.list(user.id(), PracticeRequests.parseStatus(query));
        return ApiResponse.ok(page.items(), page.meta());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PracticeItemView> add(@AuthenticationPrincipal AuthUser user, JsonBody body) {
        var request = PracticeRequests.parseAdd(body);
        return ApiResponse.ok(service.add(user.id(), request.problemId(), request.addedFrom()));
    }

    @PatchMapping("/{contestId}/{index}")
    public ApiResponse<PracticeItemView> update(@AuthenticationPrincipal AuthUser user,
            @PathVariable String contestId, @PathVariable String index, JsonBody body) {
        var request = PracticeRequests.parseUpdate(contestId, index, body);
        return ApiResponse.ok(service.update(user.id(), request.problemId(), request.status()));
    }

    @DeleteMapping("/{contestId}/{index}")
    public ApiResponse<PracticeItemView> remove(@AuthenticationPrincipal AuthUser user,
            @PathVariable String contestId, @PathVariable String index) {
        return ApiResponse.ok(service.remove(user.id(), ProblemParams.id(contestId, index)));
    }

    @PostMapping("/{contestId}/{index}/verify")
    public ApiResponse<VerifyResult> verify(@AuthenticationPrincipal AuthUser user,
            @PathVariable String contestId, @PathVariable String index) {
        return ApiResponse.ok(verifier.verify(user.id(), ProblemParams.id(contestId, index)));
    }
}
