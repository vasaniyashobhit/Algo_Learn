package com.algolearn.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.algolearn.auth.AuthRequests.LoginRequest;
import com.algolearn.common.error.AuthException;
import com.algolearn.security.JwtServiceFactory;
import com.algolearn.users.User;
import com.algolearn.users.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

/** Legacy "still runs a bcrypt comparison for an unknown email (timing), hashing the dummy once". */
class AuthServiceTimingTest {

    @Test
    void comparesForAnUnknownEmailAndHashesTheDummyOnce() {
        var hashes = new AtomicInteger();
        var compares = new AtomicInteger();
        var hasher = new PasswordHasher(4) {
            @Override
            public String hash(String password) {
                hashes.incrementAndGet();
                return super.hash(password);
            }

            @Override
            public boolean matches(String password, String hash) {
                compares.incrementAndGet();
                return super.matches(password, hash);
            }
        };
        var users = mock(UserRepository.class);
        when(users.findByEmail("ghost@example.com")).thenReturn(Optional.<User>empty());
        var jwt = JwtServiceFactory.create("q".repeat(32), Duration.ofHours(1), Clock.systemUTC());
        var service = new AuthService(users, hasher, jwt);
        for (var password : new String[] {"x", "y"}) {
            var error = catchThrowableOfType(AuthException.class,
                    () -> service.login(new LoginRequest("ghost@example.com", password)));
            assertThat(error.code().name()).isEqualTo("AUTH_INVALID_CREDENTIALS");
        }
        assertThat(compares).hasValue(2);
        assertThat(hashes).hasValue(1);
    }
}
