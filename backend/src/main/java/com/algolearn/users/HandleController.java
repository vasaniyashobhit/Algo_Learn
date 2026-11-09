package com.algolearn.users;

import com.algolearn.common.validation.JsonBody;
import com.algolearn.common.web.ApiResponse;
import com.algolearn.security.AuthUser;
import com.algolearn.users.dto.PublicUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** PUT and DELETE /users/me/handle (protected; the token is checked before the body). */
@RestController
@RequestMapping("/api/v1/users/me/handle")
public class HandleController {

    private final HandleService service;

    public HandleController(HandleService service) {
        this.service = service;
    }

    @PutMapping
    public ApiResponse<PublicUser> linkHandle(@AuthenticationPrincipal AuthUser user, JsonBody body) {
        return ApiResponse.ok(service.linkHandle(user.id(), HandleRequest.parse(body).handle()));
    }

    @DeleteMapping
    public ApiResponse<PublicUser> unlinkHandle(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(service.unlinkHandle(user.id()));
    }
}
