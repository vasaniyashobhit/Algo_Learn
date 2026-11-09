package com.algolearn.recommendations;

import com.algolearn.recommendations.calc.TopicFrequency;
import com.algolearn.recommendations.calc.TopicFrequency.TagCount;
import com.algolearn.recommendations.calc.TopicFrequency.TagCountRow;
import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Legacy tagCountsPipeline: rated problems per rating, and per (rating, tag). Independent of any user. */
@Repository
public class TagCountsQueries {

    private final JdbcTemplate jdbc;

    public TagCountsQueries(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<TagCountRow> load() {
        var totals = new LinkedHashMap<Integer, Long>();
        jdbc.query("SELECT rating, count(*) AS total FROM problems WHERE rating IS NOT NULL GROUP BY rating",
                rs -> {
                    totals.put(rs.getInt("rating"), rs.getLong("total"));
                });
        var tags = jdbc.query("SELECT p.rating, t.tag, count(*) AS n FROM problems p CROSS JOIN LATERAL "
                + "unnest(p.tags) AS t(tag) WHERE p.rating IS NOT NULL GROUP BY p.rating, t.tag",
                (rs, i) -> new TagCount(rs.getInt("rating"), rs.getString("tag"), rs.getLong("n")));
        return TopicFrequency.toTagCounts(totals, tags);
    }
}
