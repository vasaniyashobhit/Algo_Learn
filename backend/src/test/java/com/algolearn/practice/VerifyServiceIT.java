package com.algolearn.practice;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.support.Problems;
import com.algolearn.support.UserData;
import com.algolearn.sync.SubmissionWriter;
import com.algolearn.sync.SyncLock;
import com.algolearn.users.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy practice.verify.service.test.js. */
class VerifyServiceIT extends VerifyTestBase {

    VerifyServiceIT(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            UserRepository users, SyncLock lock, SubmissionWriter writer, PracticeQueries practice,
            VerifyQueries queries) {
        super(mvc, jdbc, problems, search, users, lock, writer, practice, queries);
    }

    @Test
    void createsASolvedItemAddedFromRecommendationWhenAnOkExists() {
        seed(Problems.at("50/B"));
        var user = linkedUser();
        var result = verifier(List.of(on(2, 50, "B", "OK"), on(1, 50, "B", "WRONG_ANSWER"))).verify(user, "50/B");
        assertThat(result.verified()).isTrue();
        assertThat(result.reason()).isNull();
        assertThat(result.item().problemId()).isEqualTo("50/B");
        assertThat(result.item().status()).isEqualTo("solved");
        assertThat(result.item().addedFrom()).isEqualTo("recommendation");
        assertThat(solvedItems(user)).isEqualTo(1);
    }

    @Test
    void marksAnExistingItemSolvedAndKeepsWhereItCameFrom() {
        seed(Problems.at("50/B"));
        var user = linkedUser();
        UserData.practice(jdbc, user, "50/B", "stuck", NOW.minusSeconds(60));
        var item = verifier(List.of(on(1, 50, "B", "OK"))).verify(user, "50/B").item();
        assertThat(item.status()).isEqualTo("solved");
        assertThat(item.addedFrom()).isEqualTo("stuck");
        assertThat(item.problem().id()).isEqualTo("50/B");
        assertThat(item.createdAt()).isEqualTo("2026-10-30T09:59:00.000Z");
        assertThat(item.updatedAt()).isEqualTo("2026-10-30T10:00:00.000Z");
    }

    @Test
    void acceptsAnOkOnADiv1Div2Copy() {
        seed(Problems.titled("Twin Towers", Problems.at("1900/C")), Problems.titled("twin towers",
                Problems.at("1901/A")));
        var user = linkedUser();
        var result = verifier(List.of(on(1, 1901, "A", "OK"))).verify(user, "1900/C");
        assertThat(result.verified()).isTrue();
        assertThat(result.item().problemId()).isEqualTo("1900/C");
    }

    @Test
    void acceptsAnOkEvenWhenANewerSubmissionIsStillJudging() {
        seed(Problems.at("50/B"));
        var user = linkedUser();
        assertThat(verifier(List.of(on(2, 50, "B", "TESTING"), on(1, 50, "B", "OK"))).verify(user, "50/B")
                .verified()).isTrue();
    }
}
