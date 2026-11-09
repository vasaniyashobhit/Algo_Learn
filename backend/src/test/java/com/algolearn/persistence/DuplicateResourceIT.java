package com.algolearn.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.mapping.ExceptionMapper;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Users;
import com.algolearn.users.UserRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.servlet.MockMvc;

/** Unique violations without a dedicated code end in 409 DUPLICATE_RESOURCE naming the columns. */
class DuplicateResourceIT extends DatabaseTest {

    private final UserRepository users;
    private final ExceptionMapper mapper;

    DuplicateResourceIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, ExceptionMapper mapper) {
        super(mvc, jdbc);
        this.users = users;
        this.mapper = mapper;
    }

    private AppException duplicate(Runnable write) {
        var error = catchThrowableOfType(DataIntegrityViolationException.class, write::run);
        var mapped = mapper.toAppException(error, new MockHttpServletRequest());
        assertThat(mapped.status()).isEqualTo(HttpStatus.CONFLICT);
        return mapped;
    }

    @Test
    void otherDuplicatesAreDuplicateResourceNamingTheColumns() {
        insertProblem("3/C", "hf", "T", null);
        var problem = duplicate(() -> insertProblem("3/C", "hf", "T", null));
        assertThat(problem.code()).isEqualTo(ErrorCode.DUPLICATE_RESOURCE);
        assertThat(problem.details()).isEqualTo(Map.of("fields", List.of("id")));
        var userId = users.saveAndFlush(Users.user()).getId();
        var stat = "INSERT INTO topic_stats (user_id, topic_key, kind) VALUES (?, 'dp', 'single')";
        jdbc.update(stat, userId);
        assertThat(duplicate(() -> jdbc.update(stat, userId)).details())
                .isEqualTo(Map.of("fields", List.of("user_id", "topic_key")));
        var submission = "INSERT INTO submissions (cf_submission_id, user_id, problem_id, contest_id, idx, verdict, "
                + "submitted_at) VALUES (42, ?, '1/A', 1, 'A', 'OK', now())";
        jdbc.update(submission, userId);
        assertThat(duplicate(() -> jdbc.update(submission, userId)).details())
                .isEqualTo(Map.of("fields", List.of("cf_submission_id")));
        var cache = "INSERT INTO llm_cache (key, provider, model, response) VALUES ('1/A', 'p', 'm', '{}')";
        jdbc.update(cache);
        assertThat(duplicate(() -> jdbc.update(cache)).details()).isEqualTo(Map.of("fields", List.of("key")));
    }
}
