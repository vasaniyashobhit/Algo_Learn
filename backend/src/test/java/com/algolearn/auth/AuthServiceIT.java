package com.algolearn.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.auth.AuthRequests.LoginRequest;
import com.algolearn.auth.AuthRequests.SignupRequest;
import com.algolearn.common.error.AppException;
import com.algolearn.common.error.mapping.ExceptionMapper;
import com.algolearn.security.JwtService;
import com.algolearn.support.DatabaseTest;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy auth.service.test.js. */
class AuthServiceIT extends DatabaseTest {

    private final AuthService service;
    private final JwtService jwt;
    private final ExceptionMapper mapper;

    AuthServiceIT(MockMvc mvc, JdbcTemplate jdbc, AuthService service, JwtService jwt, ExceptionMapper mapper) {
        super(mvc, jdbc);
        this.service = service;
        this.jwt = jwt;
        this.mapper = mapper;
    }

    @Test
    void storesABcryptHashAndReturnsATokenForTheNewUser() {
        var result = service.signup(new SignupRequest("ada@example.com", "secret123", "Ada"));
        var stored = jdbc.queryForObject("SELECT password_hash FROM users", String.class);
        assertThat(stored).isNotEqualTo("secret123");
        assertThat(PasswordHasher.roundsOf(stored)).isEqualTo(4);
        assertThat(new PasswordHasher(4).matches("secret123", stored)).isTrue();
        assertThat(result.user().email()).isEqualTo("ada@example.com");
        assertThat(result.user().name()).isEqualTo("Ada");
        var claims = jwt.verify(result.token());
        assertThat(claims.id().toString()).isEqualTo(result.user().id());
        assertThat(claims.email()).isEqualTo("ada@example.com");
    }

    @Test
    void rejectsADuplicateEmailWithAuthEmailTaken() {
        service.signup(new SignupRequest("ada@example.com", "secret123", "Ada"));
        var error = catchThrowableOfType(DataIntegrityViolationException.class,
                () -> service.signup(new SignupRequest("ada@example.com", "secret123", "Other")));
        AppException mapped = mapper.toAppException(error, new MockHttpServletRequest());
        assertThat(mapped.status().value()).isEqualTo(409);
        assertThat(mapped.code().name()).isEqualTo("AUTH_EMAIL_TAKEN");
        assertThat(mapped.getMessage()).isEqualTo("An account with this email already exists");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM users", Integer.class)).isEqualTo(1);
    }

    @Test
    void loginReturnsATokenForTheRightPassword() {
        service.signup(new SignupRequest("ada@example.com", "secret123", "Ada"));
        var result = service.login(new LoginRequest("ada@example.com", "secret123"));
        assertThat(result.user().name()).isEqualTo("Ada");
        assertThat(jwt.verify(result.token()).id().toString()).isEqualTo(result.user().id());
    }

    @Test
    void wrongPasswordAndUnknownEmailGiveTheSameError() {
        service.signup(new SignupRequest("ada@example.com", "secret123", "Ada"));
        var wrong = catchThrowableOfType(AppException.class,
                () -> service.login(new LoginRequest("ada@example.com", "wrong1234")));
        var unknown = catchThrowableOfType(AppException.class,
                () -> service.login(new LoginRequest("nobody@example.com", "secret123")));
        assertThat(wrong.status().value()).isEqualTo(401);
        assertThat(wrong.code().name()).isEqualTo("AUTH_INVALID_CREDENTIALS");
        assertThat(wrong.getMessage()).isEqualTo("Invalid email or password");
        assertThat(unknown.code()).isEqualTo(wrong.code());
        assertThat(unknown.getMessage()).isEqualTo(wrong.getMessage());
    }
}
