package com.algolearn.problems;

import static com.algolearn.problems.ProblemConstants.DEFAULT_LIMIT;
import static com.algolearn.problems.ProblemConstants.MAX_LIMIT;
import static com.algolearn.problems.ProblemConstants.MAX_PAGE;
import static com.algolearn.problems.ProblemConstants.MAX_QUERY_LENGTH;
import static com.algolearn.problems.ProblemConstants.MAX_RATING;
import static com.algolearn.problems.ProblemConstants.MAX_TAGS;

import com.algolearn.common.validation.Issues;
import com.algolearn.common.validation.JsText;
import com.algolearn.common.validation.QueryValues;
import com.algolearn.config.Tags;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.util.MultiValueMap;

/** GET /problems query (legacy listQuerySchema), validated; {@code tags} without duplicates. */
public record ListQuery(List<String> tags, boolean matchAll, Integer minRating, Integer maxRating, String q,
        int page, int limit) {

    private static final Set<String> TRUTHY = Set.of("true", "1", "yes", "on", "y", "enabled");
    private static final Set<String> FALSY = Set.of("false", "0", "no", "off", "n", "disabled");
    private static final String STRINGBOOL = "Invalid option: expected one of \"true\"|\"1\"|\"yes\"|\"on\"|\"y\"|"
            + "\"enabled\"|\"false\"|\"0\"|\"no\"|\"off\"|\"n\"|\"disabled\"";

    public ListQuery {
        tags = List.copyOf(tags);
    }

    public static ListQuery parse(MultiValueMap<String, String> query) {
        var issues = new Issues();
        var values = new QueryValues(query, issues);
        var tags = tags(values.all("tags"), issues);
        var matchAll = values.string("matchAll").map(v -> matchAll(v, issues)).orElse(false);
        var min = values.integer("minRating", 0, MAX_RATING, null);
        var max = values.integer("maxRating", 0, MAX_RATING, null);
        var q = values.string("q").flatMap(v -> searchText(v, issues));
        var page = values.integer("page", 1, MAX_PAGE, 1);
        var limit = values.integer("limit", 1, MAX_LIMIT, DEFAULT_LIMIT);
        if (min.isPresent() && max.isPresent() && min.get() > max.get()) {
            issues.add("query.minRating", "minRating must not exceed maxRating");
        }
        issues.throwIfAny();
        return new ListQuery(tags, matchAll, min.orElse(null), max.orElse(null), q.orElse(null),
                page.orElseThrow(), limit.orElseThrow());
    }

    /** Comma lists and repeated params, trimmed, blanks dropped; each must be one of the 37 tags. */
    static List<String> tags(List<String> raw, Issues issues) {
        var split = new ArrayList<String>();
        raw.forEach(item -> List.of(item.split(",", -1)).stream().map(JsText::trim)
                .filter(tag -> !tag.isEmpty()).forEach(split::add));
        for (var i = 0; i < split.size(); i++) {
            if (!Tags.ALL_TAGS.contains(split.get(i))) {
                issues.add("query.tags." + i, "Unknown tag");
            }
        }
        if (split.size() > MAX_TAGS) {
            issues.add("query.tags", "At most " + MAX_TAGS + " tags");
        }
        return List.copyOf(new LinkedHashSet<>(split));
    }

    private static boolean matchAll(String value, Issues issues) {
        var lower = JsText.lower(value);
        if (!TRUTHY.contains(lower) && !FALSY.contains(lower)) {
            issues.add("query.matchAll", STRINGBOOL);
        }
        return TRUTHY.contains(lower);
    }

    private static Optional<String> searchText(String value, Issues issues) {
        var text = JsText.trim(value);
        if (text.isEmpty()) {
            issues.add("query.q", "Too small: expected string to have >=1 characters");
        } else if (text.length() > MAX_QUERY_LENGTH) {
            issues.add("query.q", "Too big: expected string to have <=" + MAX_QUERY_LENGTH + " characters");
        } else {
            return Optional.of(text);
        }
        return Optional.empty();
    }
}
