package com.algolearn.sync;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.codeforces.dto.CfSubmission;
import com.algolearn.support.CfData;
import com.algolearn.support.FakeCodeforcesClient;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy fetchNewSubmissions.test.js and cooldown.test.js. */
class SubmissionPagerTest {

    static final Instant NOW = Instant.parse("2026-10-30T10:00:20Z");

    static FakeCodeforcesClient client(int count) {
        return new FakeCodeforcesClient().withSubmissions(CfData.history(count));
    }

    static List<Long> ids(SubmissionPager.Fetched fetched) {
        return fetched.submissions().stream().map(CfSubmission::id).toList();
    }

    @Test
    void readsPagesUntilAShortPageOnTheFirstSync() {
        var client = client(12);
        var fetched = SubmissionPager.fetch(client, "ada", null, 5, 3);
        assertThat(fetched.pages()).isEqualTo(3);
        assertThat(fetched.submissions()).hasSize(12);
        assertThat(client.statusCalls).containsExactly("ada 1 5", "ada 6 5", "ada 11 5");
    }

    @Test
    void stopsAtMaxPagesOnTheFirstSync() {
        var fetched = SubmissionPager.fetch(client(40), "ada", null, 5, 3);
        assertThat(fetched.pages()).isEqualTo(3);
        assertThat(ids(fetched)).isEqualTo(CfData.history(15, 26).stream().map(CfSubmission::id).toList());
    }

    @Test
    void stopsAtThePageThatReachesAfterAndKeepsOnlyNewerIds() {
        var fetched = SubmissionPager.fetch(client(40), "ada", 33L, 5, 3);
        assertThat(fetched.pages()).isEqualTo(2);
        assertThat(ids(fetched)).containsExactly(40L, 39L, 38L, 37L, 36L, 35L, 34L);
    }

    @Test
    void readsOnePageWhenNothingIsNew() {
        var fetched = SubmissionPager.fetch(client(40), "ada", 40L, 5, 3);
        assertThat(fetched.submissions()).isEmpty();
        assertThat(fetched.pages()).isEqualTo(1);
    }

    @Test
    void copesWithAMissingResult() {
        var client = new FakeCodeforcesClient() {
            @Override
            public List<CfSubmission> userStatus(String handle, int from, Integer count) {
                return null;
            }
        };
        assertThat(SubmissionPager.fetch(client, "ada", null, 5, 3))
                .isEqualTo(new SubmissionPager.Fetched(List.of(), 1));
    }

    @Test
    void cooldownIsZeroWhenNeverSyncedOrWithoutACooldown() {
        assertThat(Cooldown.leftMs(null, NOW, 20_000)).isZero();
        assertThat(Cooldown.leftMs(Instant.parse("2026-10-30T10:00:19Z"), NOW, 0)).isZero();
    }

    @Test
    void cooldownReturnsTheTimeLeft() {
        assertThat(Cooldown.leftMs(Instant.parse("2026-10-30T10:00:15Z"), NOW, 20_000)).isEqualTo(15_000);
        assertThat(Cooldown.leftMs(Instant.parse("2026-10-30T10:00:19.500Z"), NOW, 20_000)).isEqualTo(19_500);
    }

    @Test
    void cooldownIsZeroExactlyAtAndAfterItsEnd() {
        assertThat(Cooldown.leftMs(Instant.parse("2026-10-30T10:00:00Z"), NOW, 20_000)).isZero();
        assertThat(Cooldown.leftMs(Instant.parse("2026-10-30T09:00:00Z"), NOW, 20_000)).isZero();
        assertThat(SyncSettings.DEFAULT).isEqualTo(new SyncSettings(300_000, 500, 20, 20_000));
    }
}
