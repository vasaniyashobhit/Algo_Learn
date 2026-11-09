package com.algolearn.users;

import com.algolearn.common.validation.JsonBody;
import com.algolearn.common.web.ApiResponse;
import com.algolearn.security.AuthUser;
import com.algolearn.users.dto.PublicUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET and PATCH /users/me (protected; the token is checked before the body). */
@RestController
@RequestMapping("/api/v1/users")
public class UsersController {

    private final UsersService service;

    public UsersController(UsersService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public ApiResponse<PublicUser> getMe(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(service.getProfile(user.id()));
    }

    @PatchMapping("/me")
    public ApiResponse<PublicUser> updateMe(@AuthenticationPrincipal AuthUser user, JsonBody body) {
        return ApiResponse.ok(service.updateProfile(user.id(), UpdateMeRequest.parse(body)));
    }
}
