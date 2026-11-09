package com.algolearn.importer;

/**
 * One raw row of the parquet dataset (snake_case columns). Values keep their source types:
 * {@code contestId} is text in the file, {@code rating} INT64, {@code tags} a list (or null).
 */
public record DatasetRow(Object id, Object contestId, Object index, Object title, Object description,
        Object inputFormat, Object outputFormat, Object note, Object editorial, Object rating, Object tags) {
}
