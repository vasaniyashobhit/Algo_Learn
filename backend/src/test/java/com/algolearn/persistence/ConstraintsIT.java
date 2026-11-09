package com.algolearn.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.mapping.ExceptionMapper;
import com.algolearn.practice.PracticeItem;
import com.algolearn.practice.PracticeItemRepository;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Users;
import com.algolearn.users.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;

/** Unique constraints end in our error codes (legacy expectDuplicateKey cases). */
class ConstraintsIT extends DatabaseTest {

    private final UserRepository users;
    private final PracticeItemRepository practice;
    private final ExceptionMapper mapper;

    ConstraintsIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, PracticeItemRepository practice,
            ExceptionMapper mapper) {
        super(mvc, jdbc);
        this.users = users;
        this.practice = practice;
        this.mapper = mapper;
    }

    private AppException duplicate(Runnable write) {
        var error = catchThrowableOfType(DataIntegrityViolationException.class, write::run);
        var mapped = mapper.toAppException(error, new MockHttpServletRequest());
        assertThat(mapped.status()).isEqualTo(HttpStatus.CONFLICT);
        return mapped;
    }

    private UUID userId() {
        return users.saveAndFlush(Users.user()).getId();
    }

    @Test
    void aDuplicateEmailIsAuthEmailTaken() {
        var first = users.saveAndFlush(Users.user());
        var copy = Users.user();
        copy.setEmail(first.getEmail());
        assertThat(duplicate(() -> users.saveAndFlush(copy)).code()).isEqualTo(ErrorCode.AUTH_EMAIL_TAKEN);
    }

    @Test
    void cfHandlesAreUniqueIgnoringCaseButManyUsersMayHaveNone() {
        users.saveAllAndFlush(List.of(Users.user(), Users.user(), Users.user("Tourist")));
        assertThat(users.count()).isEqualTo(3);
        assertThat(duplicate(() -> users.saveAndFlush(Users.user("tourist"))).code())
                .isEqualTo(ErrorCode.CF_HANDLE_TAKEN);
    }

    @Test
    void practiceItemsAreUniquePerUserAndProblemButAnotherUserMayAddIt() {
        var userId = userId();
        practice.saveAndFlush(item(userId, "1/A"));
        practice.saveAndFlush(item(userId(), "1/A"));
        assertThat(duplicate(() -> practice.saveAndFlush(item(userId, "1/A"))).code())
                .isEqualTo(ErrorCode.PRACTICE_ITEM_EXISTS);
    }

    private static PracticeItem item(UUID userId, String problemId) {
        var item = new PracticeItem();
        item.setUserId(userId);
        item.setProblemId(problemId);
        return item;
    }
}
