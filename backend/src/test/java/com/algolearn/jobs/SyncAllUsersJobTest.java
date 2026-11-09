package com.algolearn.jobs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.algolearn.sync.SyncResult;
import com.algolearn.sync.SyncService;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

/** Legacy syncAllUsers.job.test.js (the user query itself is covered by SyncAllUsersJobIT). */
class SyncAllUsersJobTest {

    private final SyncService sync = mock(SyncService.class);
    private final JobErrorHandler errors = mock(JobErrorHandler.class);
    private final List<UUID> ids = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());

    static SyncResult result(int newSubmissions) {
        return new SyncResult(newSubmissions, 0, "2026-10-29T00:00:00.000Z", List.of());
    }

    @Test
    void syncsEveryLinkedUserOneAfterAnotherIgnoringTheCooldown() {
        when(sync.syncUser(any(), eq(true))).thenReturn(result(2));
        var summary = new SyncAllUsersJob(sync, () -> ids, errors).run();
        assertThat(summary).isEqualTo(new SyncAllUsersJob.Summary(false, 3, 3, 0, 6));
        ids.forEach(id -> verify(sync).syncUser(id, true));
    }

    @Test
    void logsAFailingUserAndContinuesWithTheNext() {
        var boom = new IllegalStateException("CF down");
        when(sync.syncUser(any(), eq(true))).thenThrow(boom).thenReturn(result(1));
        var summary = new SyncAllUsersJob(sync, () -> ids, errors).run();
        assertThat(summary).isEqualTo(new SyncAllUsersJob.Summary(false, 3, 2, 1, 2));
        verify(errors).handle(boom, "syncAllUsers", ids.getFirst().toString());
    }

    @Test
    void neverThrowsWhenListingUsersFails() {
        var boom = new IllegalStateException("db down");
        var summary = new SyncAllUsersJob(sync, () -> {
            throw boom;
        }, errors).run();
        assertThat(summary.users()).isZero();
        assertThat(summary.synced()).isZero();
        verify(errors).handle(boom, "syncAllUsers", null);
    }

    @Test
    void skipsARunThatStartsWhileAnotherIsInProgress() throws Exception {
        var started = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        when(sync.syncUser(any(), eq(true))).thenAnswer(call -> {
            started.countDown();
            assertThat(release.await(5, TimeUnit.SECONDS)).isTrue();
            return result(0);
        });
        var job = new SyncAllUsersJob(sync, () -> List.of(ids.getFirst()), errors);
        var first = CompletableFuture.supplyAsync(job::run);
        assertThat(started.await(5, TimeUnit.SECONDS)).isTrue();
        assertThat(job.run().skipped()).isTrue();
        release.countDown();
        assertThat(first.get(5, TimeUnit.SECONDS).synced()).isEqualTo(1);
        assertThat(job.run().synced()).isEqualTo(1);
    }
}
