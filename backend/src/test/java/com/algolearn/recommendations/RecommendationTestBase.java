package com.algolearn.recommendations;

import com.algolearn.problems.Problem;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.recommendations.dto.RecommendedProblem;
import com.algolearn.recommendations.dto.RecommendedTopic;
import com.algolearn.recommendations.dto.Recommendations;
import com.algolearn.support.ProblemDatabaseTest;
import com.algolearn.support.Problems;
import com.algolearn.support.UserData;
import com.algolearn.users.User;
import com.algolearn.users.UserRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy tests/helpers/recommendations.js: a fresh (empty) tag-frequency cache for every test. */
abstract class RecommendationTestBase extends ProblemDatabaseTest {

    protected final RecommendationService service;
    protected final UserRepository users;
    protected final TagCountsCache cache;

    RecommendationTestBase(MockMvc mvc, JdbcTemplate jdbc, ProblemRepository problems, SimilarSearch search,
            RecommendationService service, UserRepository users, TagCountsCache cache) {
        super(mvc, jdbc, problems, search);
        this.service = service;
        this.users = users;
        this.cache = cache;
    }

    @BeforeEach
    void freshCache() {
        cache.clear();
        clock.set(UserData.STATS_NOW);
    }

    User syncedUser(Integer rating) {
        return UserData.syncedUser(users, rating);
    }

    static Problem at(String id, Integer rating, String... tags) {
        return Problems.at(id, rating, tags);
    }

    static Problem titled(String id, String title, Integer rating, String... tags) {
        return Problems.titled(title, Problems.at(id, rating, tags));
    }

    static RecommendedTopic topicOf(Recommendations result, String topic) {
        return result.data().topics().stream().filter(t -> t.topic().equals(topic)).findFirst().orElseThrow();
    }

    static List<String> problemIds(RecommendedTopic topic) {
        return topic.problems().stream().map(RecommendedProblem::id).toList();
    }
}
