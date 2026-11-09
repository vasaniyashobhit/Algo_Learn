package com.algolearn.stats;

import com.algolearn.common.validation.Issues;
import com.algolearn.common.validation.QueryValues;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.util.MultiValueMap;

/** GET /users/me/stats?kind=single|pair&amp;sort=strength|attempted&amp;limit=1..630 (legacy statsQuerySchema). */
public record StatsQuery(String kind, String sort, int limit) {

    public static final StatsQuery DEFAULT = new StatsQuery("single", "strength", StatsConstants.DEFAULT_LIMIT);

    public static StatsQuery parse(MultiValueMap<String, String> query) {
        var issues = new Issues();
        var values = new QueryValues(query, issues);
        var kind = option(values.all("kind"), StatsConstants.KINDS, "query.kind", issues);
        var sort = option(values.all("sort"), StatsConstants.SORTS, "query.sort", issues);
        var limit = values.integer("limit", 1, StatsConstants.MAX_LIMIT, StatsConstants.DEFAULT_LIMIT);
        issues.throwIfAny();
        return new StatsQuery(kind, sort, limit.orElseThrow());
    }

    /** zod enum with a default: blank or absent → the first option; anything else must be one of them. */
    private static String option(List<String> raw, List<String> options, String field, Issues issues) {
        if (raw.isEmpty() || raw.size() == 1 && raw.getFirst().isEmpty()) {
            return options.getFirst();
        }
        if (raw.size() == 1 && options.contains(raw.getFirst())) {
            return raw.getFirst();
        }
        var expected = options.stream().map(o -> "\"" + o + "\"").collect(Collectors.joining("|"));
        issues.add(field, "Invalid option: expected one of " + expected);
        return null;
    }
}
