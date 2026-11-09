package com.algolearn.practice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

import com.algolearn.common.error.AppException;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Problems;
import com.algolearn.support.UserData;
import com.algolearn.support.Users;
import com.algolearn.users.UserRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy practice.service.test.js. */
class PracticeServiceIT extends PracticeTestBase {

    private final PracticeService service;
    private final UserRepository users;

    PracticeServiceIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            PracticeService service, UserRepository users) {
        super(mvc, jdbc, problems, search);
        this.service = service;
        this.users = users;
    }

    @Test
    void addAnswers401AuthInvalidTokenForADeletedAccount() {
        seed(Problems.at("1/A"));
        assertThatThrownBy(() -> service.add(UUID.randomUUID(), "1/A", "manual"))
                .isInstanceOfSatisfying(AppException.class, e -> {
                    assertThat(e.status().value()).isEqualTo(401);
                    assertThat(e.code().name()).isEqualTo("AUTH_INVALID_TOKEN");
                });
    }

    @Test
    void mapsADuplicateKeyToPracticeItemExistsWithTheCauseKept() {
        seed(Problems.at("1/A"));
        var user = users.save(Users.user()).getId();
        service.add(user, "1/A", "manual");
        assertThatThrownBy(() -> service.add(user, "1/A", "stuck")).isInstanceOfSatisfying(AppException.class, e -> {
            assertThat(e.status().value()).isEqualTo(409);
            assertThat(e.code().name()).isEqualTo("PRACTICE_ITEM_EXISTS");
            assertThat(e.details()).isEqualTo(java.util.Map.of("problemId", "1/A"));
            assertThat(e.getCause()).isInstanceOf(DuplicateKeyException.class);
        });
    }

    @Test
    void reThrowsOtherCreateFailuresUnchanged() {
        seed(Problems.at("1/A"));
        var user = users.save(Users.user()).getId();
        var boom = new DataIntegrityViolationException("write failed");
        var queries = mock(PracticeQueries.class);
        when(queries.summary("1/A")).thenReturn(Optional.of(new ProblemSummary("1/A", 1, "A", "T", 1, List.of(), false,
                "hf", null)));
        when(queries.insert(any(), any(), any(), any())).thenThrow(boom);
        assertThatThrownBy(() -> new PracticeService(queries, users, clock).add(user, "1/A", "manual")).isSameAs(boom);
    }

    @Test
    void updateAndRemoveOnlyTouchTheCallersItem() {
        seed(Problems.at("1/A"));
        var alice = users.save(Users.user()).getId();
        var bob = users.save(Users.user()).getId();
        UserData.practice(jdbc, alice, "1/A");
        assertThatThrownBy(() -> service.update(bob, "1/A", "solved")).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.code().name()).isEqualTo("NOT_FOUND"));
        assertThatThrownBy(() -> service.remove(bob, "1/A")).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.code().name()).isEqualTo("NOT_FOUND"));
        assertThat(jdbc.queryForObject("SELECT status FROM practice_items WHERE user_id = ?", String.class, alice))
                .isEqualTo("todo");
    }

    @Test
    void listsAnEmptyPracticeListWithoutQueryingProblems() {
        var counting = spy(new NamedParameterJdbcTemplate(jdbc));
        var page = new PracticeService(new PracticeQueries(counting), users, clock).list(UUID.randomUUID(), null);
        assertThat(page).isEqualTo(new PracticeService.PracticePage(List.of(),
                new PracticeService.PracticeMeta(0, null)));
        assertThat(mockingDetails(counting).getInvocations().stream()
                .filter(call -> call.getMethod().getName().startsWith("query"))).hasSize(1);
    }
}
