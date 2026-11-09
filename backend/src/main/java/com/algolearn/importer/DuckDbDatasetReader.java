package com.algolearn.importer;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import java.sql.Array;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Reads the parquet dataset with an in-memory DuckDB ({@code read_parquet}); INT64 values arrive as Long. */
@Component
public class DuckDbDatasetReader implements DatasetReader {

    /** The 11 dataset columns, in file order. */
    public static final List<String> DATASET_COLUMNS = List.of("id", "contest_id", "index", "title", "description",
            "input_format", "output_format", "note", "editorial", "rating", "tags");

    private static final String SQL = "SELECT " + String.join(", ",
            DATASET_COLUMNS.stream().map(c -> '"' + c + '"').toList()) + " FROM read_parquet(?)";

    @Override
    public List<DatasetRow> read(String path) {
        try (var connection = DriverManager.getConnection("jdbc:duckdb:");
                var statement = connection.prepareStatement(SQL)) {
            statement.setString(1, path);
            try (var result = statement.executeQuery()) {
                var rows = new ArrayList<DatasetRow>();
                while (result.next()) {
                    rows.add(toRow(result));
                }
                return rows;
            }
        } catch (SQLException e) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR,
                    "Could not read parquet file: " + path, Map.of("path", path), e);
        }
    }

    private static DatasetRow toRow(ResultSet rs) throws SQLException {
        return new DatasetRow(rs.getObject(1), rs.getObject(2), rs.getObject(3), rs.getObject(4), rs.getObject(5),
                rs.getObject(6), rs.getObject(7), rs.getObject(8), rs.getObject(9), rs.getObject(10),
                toList(rs.getArray(11)));
    }

    private static List<Object> toList(Array array) throws SQLException {
        return array == null ? null : Arrays.asList((Object[]) array.getArray());
    }
}
