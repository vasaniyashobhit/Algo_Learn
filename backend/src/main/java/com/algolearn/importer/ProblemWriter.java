package com.algolearn.importer;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Upserts problem documents by id in batches (legacy bulkUpsert). Idempotent: a re-run creates nothing. */
@Component
public class ProblemWriter {

    public static final int BATCH_SIZE = 500;

    private final JdbcTemplate jdbc;
    private final Clock clock;

    public ProblemWriter(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** OVERWRITE (dataset import: hf text replaces stubs) or INSERT_ONLY (API sync). */
    public enum Mode { OVERWRITE, INSERT_ONLY }

    /** Totals across batches; {@code matched} = rows that already existed, {@code modified} = changed ones. */
    public record Totals(int batches, int upserted, int modified, int matched) {
    }

    /** Reported after each batch. */
    public record BatchInfo(int batchIndex, int size, Totals totals) {
    }

    public Totals upsert(List<ProblemDoc> docs, Mode mode, int batchSize, Consumer<BatchInfo> onBatch) {
        var totals = new Totals(0, 0, 0, 0);
        var batches = Chunks.of(docs, batchSize);
        for (var i = 0; i < batches.size(); i++) {
            var batch = batches.get(i);
            List<Boolean> written;
            try {
                written = write(batch, mode);
            } catch (DataAccessException e) {
                throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR,
                        "Bulk upsert failed in batch " + i, Map.of("batchIndex", i, "batchSize", batch.size()), e);
            }
            var inserted = (int) written.stream().filter(Boolean::booleanValue).count();
            totals = new Totals(totals.batches() + 1, totals.upserted() + inserted,
                    totals.modified() + written.size() - inserted, totals.matched() + batch.size() - inserted);
            onBatch.accept(new BatchInfo(i, batch.size(), totals));
        }
        return totals;
    }

    public long count() {
        return jdbc.queryForObject("SELECT count(*) FROM problems", Long.class);
    }

    private List<Boolean> write(List<ProblemDoc> batch, Mode mode) {
        var sql = ProblemUpsertSql.build(mode, batch.size());
        var now = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        return jdbc.query(connection -> bind(connection, connection.prepareStatement(sql), batch, now),
                (rs, rowNum) -> rs.getBoolean(1));
    }

    private static PreparedStatement bind(Connection connection, PreparedStatement ps, List<ProblemDoc> batch,
            OffsetDateTime now) throws SQLException {
        var i = 0;
        for (var doc : batch) {
            ps.setString(++i, doc.id());
            ps.setObject(++i, doc.contestId(), Types.INTEGER);
            for (var text : List.of(doc.index(), doc.title(), doc.description(), doc.inputFormat(),
                    doc.outputFormat(), doc.note(), doc.editorial())) {
                ps.setString(++i, text);
            }
            ps.setObject(++i, doc.rating(), Types.INTEGER);
            ps.setArray(++i, connection.createArrayOf("text", doc.tags().toArray()));
            ps.setInt(++i, doc.tagCount());
            ps.setBoolean(++i, doc.hasEditorial());
            ps.setString(++i, doc.source());
            ps.setObject(++i, now);
            ps.setObject(++i, now);
        }
        return ps;
    }
}
