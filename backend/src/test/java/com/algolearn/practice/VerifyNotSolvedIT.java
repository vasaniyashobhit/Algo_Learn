package com.algolearn.practice;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Problems;
import com.algolearn.sync.SubmissionWriter;
import com.algolearn.sync.SyncLock;
import com.algolearn.users.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy practice.verify.service.test.js — not solved (200, not an error). */
class VerifyNotSolvedIT extends VerifyTestBase {

    VerifyNotSolvedIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            UserRepository users, SyncLock lock, SubmissionWriter writer, PracticeQueries practice,
            VerifyQueries queries) {
        super(mvc, jdbc, problems, search, users, lock, writer, practice, queries);
    }

    @Test
    void notSolvedYetWithoutAnOkAndLeavesThePracticeListAlone() {
        seed(Problems.at("50/B"), Problems.titled("Title 50/B", Problems.at("53/A")));
        var user = linkedUser();
        var result = verifier(List.of(on(2, 53, "A", "OK"), on(1, 50, "B", "WRONG_ANSWER"))).verify(user, "50/B");
        assertThat(result).isEqualTo(VerifyResult.notSolved("NOT_SOLVED_YET"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM practice_items", Long.class)).isZero();
    }

    @Test
    void stillJudgingWhenTheNewestSubmissionOnTheProblemHasNoFinalVerdict() {
        seed(Problems.at("50/B"));
        var user = linkedUser();
        assertThat(verifier(List.of(on(2, 50, "B", null), on(1, 50, "B", "WRONG_ANSWER"))).verify(user, "50/B"))
                .isEqualTo(VerifyResult.notSolved("STILL_JUDGING"));
    }

    @Test
    void notSolvedYetWhenAJudgedSubmissionIsNewerThanThePendingOne() {
        seed(Problems.at("50/B"));
        var user = linkedUser();
        assertThat(verifier(List.of(on(3, 50, "B", "WRONG_ANSWER"), on(2, 50, "B", "TESTING"))).verify(user, "50/B")
                .reason()).isEqualTo("NOT_SOLVED_YET");
    }

    @Test
    void ignoresPendingSubmissionsOnOtherProblems() {
        seed(Problems.at("50/B"));
        var user = linkedUser();
        assertThat(verifier(List.of(on(2, 60, "A", "TESTING"), on(1, 50, "B", "WRONG_ANSWER"))).verify(user, "50/B")
                .reason()).isEqualTo("NOT_SOLVED_YET");
    }
}
