package com.algolearn.internal;

import com.algolearn.common.web.ApiResponse;
import com.algolearn.jobs.BackgroundJobs;
import com.algolearn.jobs.SyncAllUsersJob;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * POST /internal/sync-all (hosted cron; {@link CronSecretFilter} checks the secret first): answers
 * 202 at once and runs the job in the background.
 */
@RestController
@RequestMapping("/api/v1/internal")
public class InternalController {

    private final BackgroundJobs background;
    private final SyncAllUsersJob syncAll;

    public InternalController(BackgroundJobs background, SyncAllUsersJob syncAll) {
        this.background = background;
        this.syncAll = syncAll;
    }

    @PostMapping("/sync-all")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ApiResponse<Started> syncAll() {
        background.start(SyncAllUsersJob.NAME, syncAll::run);
        return ApiResponse.ok(new Started(true, SyncAllUsersJob.NAME));
    }

    /** The 202 body. */
    public record Started(boolean started, String job) {
    }
}
