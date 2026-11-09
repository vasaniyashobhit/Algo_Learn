package com.algolearn.auth;

import com.algolearn.auth.AuthRequests.LoginRequest;
import com.algolearn.auth.AuthRequests.SignupRequest;
import com.algolearn.common.error.AuthException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.security.AuthUser;
import com.algolearn.security.JwtService;
import com.algolearn.users.User;
import com.algolearn.users.UserRepository;
import com.algolearn.users.dto.PublicUser;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Signup and login. A duplicate email fails on the unique constraint {@code uk_users_email}, which
 * the global handler turns into 409 AUTH_EMAIL_TAKEN. Login answers the same error for an unknown
 * email and a wrong password, and runs a bcrypt comparison in both cases (similar timing).
 */
@Service
public class AuthService {

    static final String DUMMY_PASSWORD = "not-a-real-password-0";

    private final UserRepository users;
    private final PasswordHasher hasher;
    private final JwtService jwt;
    private final AtomicReference<String> dummyHash = new AtomicReference<>();

    public AuthService(UserRepository users, PasswordHasher hasher, JwtService jwt) {
        this.users = users;
        this.hasher = hasher;
        this.jwt = jwt;
    }

    @Transactional
    public AuthResult signup(SignupRequest request) {
        var user = new User();
        user.setEmail(request.email());
        user.setPasswordHash(hasher.hash(request.password()));
        user.setName(request.name());
        return issue(users.saveAndFlush(user));
    }

    @Transactional(readOnly = true)
    public AuthResult login(LoginRequest request) {
        var user = users.findByEmail(request.email());
        var hash = user.map(User::getPasswordHash).orElseGet(this::dummyHash);
        var matches = hasher.matches(request.password(), hash);
        if (user.isEmpty() || !matches) {
            throw new AuthException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Invalid email or password");
        }
        return issue(user.get());
    }

    /** Compared against when the email is unknown; hashed once, with the configured cost. */
    private String dummyHash() {
        return dummyHash.updateAndGet(current -> current != null ? current : hasher.hash(DUMMY_PASSWORD));
    }

    private AuthResult issue(User user) {
        var publicUser = PublicUser.of(user);
        return new AuthResult(jwt.sign(new AuthUser(user.getId(), user.getEmail())), publicUser);
    }

    /** {@code { token, user }}. */
    public record AuthResult(String token, PublicUser user) {
    }
}
