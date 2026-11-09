package com.algolearn.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/** Legacy stats.schema.test.js. */
class StatsQueryTest {

    static MultiValueMap<String, String> query(String... pairs) {
        var map = new LinkedMultiValueMap<String, String>();
        for (var i = 0; i < pairs.length; i += 2) {
            map.add(pairs[i], pairs[i + 1]);
        }
        return map;
    }

    @Test
    void defaultsToSingleTopicsByStrength50PerPage() {
        assertThat(StatsQuery.parse(query())).isEqualTo(StatsQuery.DEFAULT);
        assertThat(StatsQuery.parse(query("kind", "", "sort", "", "limit", ""))).isEqualTo(StatsQuery.DEFAULT);
        assertThat(StatsQuery.DEFAULT).isEqualTo(new StatsQuery("single", "strength", 50));
    }

    @Test
    void acceptsPairsAttemptedSortAndALimitUpTo630() {
        assertThat(StatsQuery.parse(query("kind", "pair", "sort", "attempted", "limit", "630")))
                .isEqualTo(new StatsQuery("pair", "attempted", 630));
    }

    @ParameterizedTest
    @ValueSource(strings = {"kind=triple", "sort=name", "limit=0", "limit=631", "limit=2.5", "kind=pair&kind=single"})
    void rejectsBadValues(String raw) {
        var map = new LinkedMultiValueMap<String, String>();
        for (var pair : raw.split("&")) {
            var parts = pair.split("=");
            map.add(parts[0], parts[1]);
        }
        assertThatThrownBy(() -> StatsQuery.parse(map)).isInstanceOf(ValidationException.class);
    }

    @Test
    void reportsZodMessagesForEveryBadField() {
        var error = (ValidationException) catchThrowable(() ->
                StatsQuery.parse(query("kind", "triple", "sort", "name", "limit", "0")));
        @SuppressWarnings("unchecked")
        var details = (List<FieldIssue>) error.details();
        assertThat(details).containsExactly(
                new FieldIssue("query.kind", "Invalid option: expected one of \"single\"|\"pair\""),
                new FieldIssue("query.sort", "Invalid option: expected one of \"strength\"|\"attempted\""),
                new FieldIssue("query.limit", "Too small: expected number to be >=1"));
    }
}
