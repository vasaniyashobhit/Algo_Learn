package com.algolearn.importer;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import java.sql.Array;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Applies rating/tag changes from Codeforces to existing cf_api rows (legacy updateCfApiRows).
 * Only rating, tags, tag_count and updated_at are set, and the UPDATE re-checks source = 'cf_api',
 * so hf rows and every text field are never touched.
 */
@Component
public class CfApiUpdater {

    private static final String UPDATE = "UPDATE problems SET rating = ?, tags = ?::text[], tag_count = ?, "
            + "updated_at = ? WHERE id = ? AND source = 'cf_api'";

    private final JdbcTemplate jdbc;
    private final Clock clock;

    public CfApiUpdater(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** Stored rating and tags of one row. */
    public record Row(String id, Integer rating, List<String> tags) {
    }

    /** True when Codeforces now reports a different rating or tag set (tag order is ignored). */
    public static boolean hasChanged(Row row, ProblemDoc fresh) {
        return !Objects.equals(row.rating(), fresh.rating()) || !sortedKey(row.tags()).equals(sortedKey(fresh.tags()));
    }

    /** The fresh documents for rows whose rating or tags differ. */
    public static List<ProblemDoc> changes(List<Row> rows, List<ProblemDoc> docs) {
        var fresh = docs.stream().collect(Collectors.toMap(ProblemDoc::id, Function.identity(), (a, b) -> b));
        return rows.stream().filter(row -> fresh.containsKey(row.id()) && hasChanged(row, fresh.get(row.id())))
                .map(row -> fresh.get(row.id())).toList();
    }

    /** Returns how many rows changed. */
    public int apply(List<ProblemDoc> docs) {
        try {
            var rows = jdbc.query("SELECT id, rating, tags FROM problems WHERE source = 'cf_api'",
                    (rs, n) -> new Row(rs.getString(1), rs.getObject(2, Integer.class), strings(rs.getArray(3))));
            var changed = changes(rows, docs);
            if (changed.isEmpty()) {
                return 0;
            }
            var now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
            var counts = jdbc.batchUpdate(UPDATE, changed, changed.size(), (ps, doc) -> {
                ps.setObject(1, doc.rating(), Types.INTEGER);
                ps.setArray(2, ps.getConnection().createArrayOf("text", doc.tags().toArray()));
                ps.setInt(3, doc.tagCount());
                ps.setObject(4, now);
                ps.setString(5, doc.id());
            });
            return Arrays.stream(counts).flatMapToInt(Arrays::stream).sum();
        } catch (DataAccessException e) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR,
                    "Updating cf_api problems failed", null, e);
        }
    }

    private static String sortedKey(List<String> tags) {
        return tags == null ? "" : tags.stream().sorted().collect(Collectors.joining(","));
    }

    private static List<String> strings(Array array) throws SQLException {
        return array == null ? List.of() : List.of((String[]) array.getArray());
    }
}
