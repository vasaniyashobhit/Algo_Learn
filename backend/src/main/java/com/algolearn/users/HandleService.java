package com.algolearn.users;

import com.algolearn.codeforces.CfCalls;
import com.algolearn.codeforces.CodeforcesClient;
import com.algolearn.common.error.ConflictException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import com.algolearn.sync.SyncLock;
import com.algolearn.users.dto.PublicUser;
import java.time.Clock;
import java.util.Locale;
import java.util.UUID;
import java.util.function.IntSupplier;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Link / unlink a Codeforces handle (legacy handle.service.js). Both refuse while a sync is running
 * (SYNC_IN_PROGRESS). Linking a different handle (or unlinking) deletes the user's submissions and
 * topic stats in the same transaction as the user update.
 */
@Service
public class HandleService {

    private final CodeforcesClient client;
    private final UserRepository users;
    private final HandleQueries queries;
    private final SyncLock lock;
    private final TransactionTemplate tx;
    private final Clock clock;

    public HandleService(CodeforcesClient client, UserRepository users, HandleQueries queries, SyncLock lock,
            TransactionTemplate tx, Clock clock) {
        this.client = client;
        this.users = users;
        this.queries = queries;
        this.lock = lock;
        this.tx = tx;
        this.clock = clock;
    }

    public PublicUser linkHandle(UUID userId, String handle) {
        var current = users.findById(userId).orElseThrow(UsersService::accountGone);
        if (queries.takenByOther(userId, handle)) {
            throw handleTaken(null);
        }
        var infos = CfCalls.call(() -> client.userInfo(handle));
        var info = infos == null || infos.isEmpty() ? null : infos.getFirst();
        if (info == null || info.handle() == null || info.handle().isEmpty()) {
            throw new NotFoundException(ErrorCode.CF_HANDLE_NOT_FOUND, "Codeforces handle not found");
        }
        var changed = !sameHandle(current.getCfHandle(), info.handle());
        try {
            updateUnlocked(userId, changed, () -> queries.link(userId, info, changed, clock.instant()));
        } catch (DuplicateKeyException e) {
            throw handleTaken(e);
        }
        return reload(userId);
    }

    public PublicUser unlinkHandle(UUID userId) {
        updateUnlocked(userId, true, () -> queries.unlink(userId, clock.instant()));
        return reload(userId);
    }

    private void updateUnlocked(UUID userId, boolean deleteSyncedData, IntSupplier update) {
        tx.executeWithoutResult(status -> {
            if (update.getAsInt() == 0) {
                throw lock.lockedOrGone(userId);
            }
            if (deleteSyncedData) {
                queries.deleteSyncedData(userId);
            }
        });
    }

    private PublicUser reload(UUID userId) {
        return users.findById(userId).map(PublicUser::of).orElseThrow(UsersService::accountGone);
    }

    private static boolean sameHandle(String a, String b) {
        return a != null && a.toLowerCase(Locale.ROOT).equals(b.toLowerCase(Locale.ROOT));
    }

    private static ConflictException handleTaken(Throwable cause) {
        return new ConflictException(ErrorCode.CF_HANDLE_TAKEN,
                "This Codeforces handle is already linked to another account", null, cause);
    }
}
