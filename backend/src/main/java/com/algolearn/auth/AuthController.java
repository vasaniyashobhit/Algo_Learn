package com.algolearn.auth;

import com.algolearn.auth.AuthService.AuthResult;
import com.algolearn.common.validation.JsonBody;
import com.algolearn.common.web.ApiResponse;
import com.algolearn.security.AuthUser;
import com.algolearn.users.UsersService;
import com.algolearn.users.dto.PublicUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** POST /auth/signup (201), POST /auth/login, GET /auth/me (same profile as GET /users/me). */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;
    private final UsersService users;

    public AuthController(AuthService auth, UsersService users) {
        this.auth = auth;
        this.users = users;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthResult> signup(JsonBody body) {
        return ApiResponse.ok(auth.signup(AuthRequests.signup(body)));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResult> login(JsonBody body) {
        return ApiResponse.ok(auth.login(AuthRequests.login(body)));
    }

    @GetMapping("/me")
    public ApiResponse<PublicUser> me(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(users.getProfile(user.id()));
    }
}
