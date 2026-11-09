package com.algolearn.users;

import com.algolearn.common.error.AuthException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.users.dto.PublicUser;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The current user's profile. A valid token whose account is gone counts as an invalid token. */
@Service
public class UsersService {

    private final UserRepository users;

    public UsersService(UserRepository users) {
        this.users = users;
    }

    /** Legacy accountGone(): the client logs out on AUTH_INVALID_TOKEN. */
    public static AuthException accountGone() {
        return new AuthException(ErrorCode.AUTH_INVALID_TOKEN, "This account no longer exists");
    }

    @Transactional(readOnly = true)
    public PublicUser getProfile(UUID userId) {
        return users.findById(userId).map(PublicUser::of).orElseThrow(UsersService::accountGone);
    }

    @Transactional
    public PublicUser updateProfile(UUID userId, UpdateMeRequest request) {
        var user = users.findById(userId).orElseThrow(UsersService::accountGone);
        user.setName(request.name());
        return PublicUser.of(users.saveAndFlush(user));
    }
}
