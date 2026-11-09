package com.algolearn.sync;

import com.algolearn.common.web.ApiResponse;
import com.algolearn.security.AuthUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** POST /users/me/sync (protected). */
@RestController
@RequestMapping("/api/v1/users/me")
public class SyncController {

    private final SyncService service;

    public SyncController(SyncService service) {
        this.service = service;
    }

    @PostMapping("/sync")
    public ApiResponse<SyncResult> syncMe(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(service.syncUser(user.id()));
    }
}
