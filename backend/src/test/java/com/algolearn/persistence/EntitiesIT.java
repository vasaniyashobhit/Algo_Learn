package com.algolearn.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.practice.PracticeItem;
import com.algolearn.practice.PracticeItemRepository;
import com.algolearn.stats.LastResult;
import com.algolearn.stats.TopicStat;
import com.algolearn.stats.TopicStatRepository;
import com.algolearn.support.DatabaseTest;
import com.algolearn.support.Users;
import com.algolearn.users.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/** Users, topic stats and practice items round-trip through PostgreSQL with their defaults (legacy model tests). */
class EntitiesIT extends DatabaseTest {

    private final UserRepository users;
    private final TopicStatRepository stats;
    private final PracticeItemRepository practice;

    EntitiesIT(MockMvc mvc, JdbcTemplate jdbc, UserRepository users, TopicStatRepository stats,
            PracticeItemRepository practice) {
        super(mvc, jdbc);
        this.users = users;
        this.stats = stats;
        this.practice = practice;
    }

    private UUID userId() {
        return users.saveAndFlush(Users.user()).getId();
    }

    @Test
    void usersGetNullAndEmptyDefaultsAndTimestamps() {
        var user = users.findById(userId()).orElseThrow();
        assertThat(user.getCfHandle()).isNull();
        assertThat(List.of(user.getEmail(), user.getName())).doesNotContainNull();
        assertThat(user.getCfRating()).isNull();
        assertThat(user.getLastSyncedAt()).isNull();
        assertThat(user.getSyncLockedUntil()).isNull();
        assertThat(user.getCreatedAt()).isNotNull();
    }

    @Test
    void topicStatsStoreLastResultsAsJsonWithZeroCountersByDefault() {
        var stat = new TopicStat();
        stat.setUserId(userId());
        stat.setTopicKey("bitmasks+dp");
        stat.setKind("pair");
        stat.setLastResults(List.of(new LastResult("1/A", true), new LastResult("2/B", false)));
        var saved = stats.findByUserId(stats.saveAndFlush(stat).getUserId()).getFirst();
        assertThat(saved.getLastResults()).containsExactly(new LastResult("1/A", true), new LastResult("2/B", false));
        assertThat(List.of(saved.getAttempted(), saved.getSolved(), saved.getFailed())).containsOnly(0);
        assertThat(saved.getStrength()).isZero();
        assertThat(saved.getAvgSolvedRating()).isNull();
    }

    @Test
    void practiceItemsDefaultToTodoAndManual() {
        var item = new PracticeItem();
        item.setUserId(userId());
        item.setProblemId("1/A");
        var saved = practice.findById(practice.saveAndFlush(item).getId()).orElseThrow();
        assertThat(List.of(saved.getStatus(), saved.getAddedFrom())).containsExactly("todo", "manual");
        assertThat(saved.getUpdatedAt()).isNotNull();
    }
}
