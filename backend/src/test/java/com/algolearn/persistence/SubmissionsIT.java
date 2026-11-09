package com.algolearn.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.problems.Problem;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Users;
import com.algolearn.sync.Submission;
import com.algolearn.sync.SubmissionRepository;
import com.algolearn.users.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Submissions and problems through JPA (legacy submission/problem model tests). */
class SubmissionsIT extends DatabaseTest {

    private final SubmissionRepository submissions;
    private final UserRepository users;
    private final ProblemRepository problems;

    SubmissionsIT(MockMvc mvc, JdbcTemplate jdbc, SubmissionRepository submissions, UserRepository users,
            ProblemRepository problems) {
        super(mvc, jdbc);
        this.submissions = submissions;
        this.users = users;
        this.problems = problems;
    }

    private static Submission submission(UUID userId, long cfId, Instant at) {
        var submission = new Submission();
        submission.setCfSubmissionId(cfId);
        submission.setUserId(userId);
        submission.setProblemId("1/A");
        submission.setContestId(1);
        submission.setIndex("A");
        submission.setVerdict("TIME_LIMIT_EXCEEDED");
        submission.setSubmittedAt(at);
        return submission;
    }

    @Test
    void defaultsRatingToNullAndTagsToEmptyAndListsNewestFirst() {
        var userId = users.saveAndFlush(Users.user()).getId();
        var older = submission(userId, 1, Instant.parse("2026-01-01T00:00:00Z"));
        var newer = submission(userId, 2, Instant.parse("2026-03-01T00:00:00Z"));
        newer.setProblemRating(1500);
        newer.setProblemTags(List.of("dp", "math"));
        submissions.saveAllAndFlush(List.of(older, newer));
        var stored = submissions.findByUserIdOrderBySubmittedAtDesc(userId);
        assertThat(stored).extracting(Submission::getCfSubmissionId).containsExactly(2L, 1L);
        assertThat(stored.getFirst().getProblemTags()).containsExactly("dp", "math");
        assertThat(stored.getFirst().getSubmittedAt()).isEqualTo(Instant.parse("2026-03-01T00:00:00Z"));
        assertThat(stored.getLast().getProblemRating()).isNull();
        assertThat(stored.getLast().getProblemTags()).isEmpty();
    }

    @Test
    void savesAndReadsAProblemWithItsTagArray() {
        var problem = new Problem();
        problem.setId("1950/F2");
        problem.setContestId(1950);
        problem.setIndex("F2");
        problem.setTitle("T");
        problem.setTags(List.of("dp", "*special"));
        problem.setTagCount(2);
        problems.saveAndFlush(problem);
        var stored = problems.findById("1950/F2").orElseThrow();
        assertThat(stored.getTags()).containsExactly("dp", "*special");
        assertThat(stored.getIndex()).isEqualTo("F2");
        assertThat(stored.getUpdatedAt()).isNotNull();
    }
}
