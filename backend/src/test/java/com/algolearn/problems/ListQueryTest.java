package com.algolearn.problems;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import com.algolearn.config.Tags;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/** Legacy problems.schema.test.js (listQuerySchema). */
class ListQueryTest {

    static MultiValueMap<String, String> query(String... pairs) {
        var query = new LinkedMultiValueMap<String, String>();
        for (var i = 0; i < pairs.length; i += 2) {
            query.add(pairs[i], pairs[i + 1]);
        }
        return query;
    }

    @SuppressWarnings("unchecked")
    static List<Object> issues(MultiValueMap<String, String> query) {
        return (List<Object>) catchThrowableOfType(ValidationException.class, () -> ListQuery.parse(query)).details();
    }

    @Test
    void appliesDefaultsToAnEmptyQuery() {
        assertThat(ListQuery.parse(query())).isEqualTo(new ListQuery(List.of(), false, null, null, null, 1, 20));
    }

    @Test
    void acceptsCommaSeparatedAndRepeatedTagsRemovingDuplicates() {
        assertThat(ListQuery.parse(query("tags", "dp, greedy")).tags()).containsExactly("dp", "greedy");
        assertThat(ListQuery.parse(query("tags", "dp", "tags", "math,dp")).tags()).containsExactly("dp", "math");
        assertThat(ListQuery.parse(query("tags", "*special")).tags()).containsExactly("*special");
        assertThat(ListQuery.parse(query("tags", "data structures, ,")).tags()).containsExactly("data structures");
    }

    @Test
    void coercesNumbersAndBooleansAndTreatsBlanksAsMissing() {
        var parsed = ListQuery.parse(query("matchAll", "true", "minRating", "800", "page", "3", "limit", "", "q", ""));
        assertThat(parsed).isEqualTo(new ListQuery(List.of(), true, 800, null, null, 3, 20));
        assertThat(ListQuery.parse(query("matchAll", "NO", "q", "  two arrays ")))
                .isEqualTo(new ListQuery(List.of(), false, null, null, "two arrays", 1, 20));
    }

    @Test
    void rejectsInvalidValues() {
        var cases = List.of(query("tags", "nope"), query("tags", String.join(",", Tags.TOPIC_TAGS.subList(0, 11))),
                query("limit", "51"), query("page", "0"), query("minRating", "-1"), query("minRating", "1.5"),
                query("minRating", "1500", "maxRating", "1000"), query("matchAll", "maybe"),
                query("q", "x".repeat(101)), query("q", "   "), query("page", "abc"), query("page", "1", "page", "2"));
        cases.forEach(q -> assertThat(issues(q)).as(q.toString()).isNotEmpty());
    }

    @Test
    void namesTheFieldsLikeZod() {
        assertThat(issues(query("tags", "dp,nope"))).containsExactly(new FieldIssue("query.tags.1", "Unknown tag"));
        assertThat(issues(query("limit", "51", "minRating", "2000", "maxRating", "1000"))).containsExactly(
                new FieldIssue("query.limit", "Too big: expected number to be <=50"),
                new FieldIssue("query.minRating", "minRating must not exceed maxRating"));
        assertThat(issues(query("page", "abc")))
                .containsExactly(new FieldIssue("query.page", "Invalid input: expected number, received NaN"));
        assertThat(issues(query("minRating", "1.5")))
                .containsExactly(new FieldIssue("query.minRating", "Invalid input: expected int, received number"));
        assertThat(issues(query("tags", String.join(",", Tags.TOPIC_TAGS.subList(0, 11)))))
                .containsExactly(new FieldIssue("query.tags", "At most 10 tags"));
        assertThat(issues(query("q", "a", "q", "b")))
                .containsExactly(new FieldIssue("query.q", "Invalid input: expected string, received array"));
    }
}
