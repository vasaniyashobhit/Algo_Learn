package com.algolearn.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.AuthException;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Users;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy users.service.test.js. */
class UsersServiceIT extends DatabaseTest {

    private final UsersService service;
    private final UserRepository users;

    UsersServiceIT(MockMvc mvc, JdbcTemplate jdbc, UsersService service, UserRepository users) {
        super(mvc, jdbc);
        this.service = service;
        this.users = users;
    }

    private static void expectAccountGone(Runnable call) {
        var error = catchThrowableOfType(AuthException.class, call::run);
        assertThat(error.status().value()).isEqualTo(401);
        assertThat(error.code().name()).isEqualTo("AUTH_INVALID_TOKEN");
    }

    @Test
    void getProfileReturnsThePublicProfile() {
        var user = Users.user();
        user.setName("Ada");
        var created = users.saveAndFlush(user);
        var profile = service.getProfile(created.getId());
        assertThat(profile.id()).isEqualTo(created.getId().toString());
        assertThat(profile.email()).isEqualTo(created.getEmail());
        assertThat(profile.name()).isEqualTo("Ada");
    }

    @Test
    void updateProfileChangesOnlyTheName() {
        var created = users.saveAndFlush(Users.user());
        var profile = service.updateProfile(created.getId(), new UpdateMeRequest("New Name"));
        assertThat(profile.name()).isEqualTo("New Name");
        var stored = users.findById(created.getId()).orElseThrow();
        assertThat(stored.getName()).isEqualTo("New Name");
        assertThat(stored.getEmail()).isEqualTo(created.getEmail());
        assertThat(stored.getPasswordHash()).isEqualTo(created.getPasswordHash());
    }

    @Test
    void aMissingAccountIsAnInvalidToken() {
        expectAccountGone(() -> service.getProfile(UUID.randomUUID()));
        expectAccountGone(() -> service.updateProfile(UUID.randomUUID(), new UpdateMeRequest("Ghost")));
    }
}
