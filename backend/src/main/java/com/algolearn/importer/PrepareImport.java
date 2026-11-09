package com.algolearn.importer;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;

/** Cleans raw dataset rows and counts what happened (legacy prepareImport). */
public final class PrepareImport {

    private PrepareImport() {
    }

    public static Prepared prepare(List<DatasetRow> rows) {
        var kept = rows.stream().map(CleanProblem::clean).flatMap(Optional::stream).toList();
        var partition = ProblemValidator.partition(kept);
        var valid = partition.valid();
        var summary = new Summary(rows.size(), rows.size() - kept.size(),
                partition.rejected().values().stream().mapToInt(Integer::intValue).sum(), partition.rejected(),
                List.copyOf(partition.sampleIds()), valid.size(),
                count(valid, doc -> doc.rating() != null), count(valid, doc -> doc.tagCount() > 0),
                count(valid, ProblemDoc::hasEditorial), count(valid, CleanProblem::hasSpecialTag));
        return new Prepared(valid, summary);
    }

    private static int count(List<ProblemDoc> docs, Predicate<ProblemDoc> predicate) {
        return (int) docs.stream().filter(predicate).count();
    }

    /** The documents to write plus the counts. */
    public record Prepared(List<ProblemDoc> docs, Summary summary) {
    }

    /** Counts from cleaning and validation (the first fields of the import summary). */
    public record Summary(int read, int skippedEmptyDescription, int rejected, Map<String, Integer> rejectedByReason,
            List<String> rejectedIds, int toUpsert, int withRating, int withTags, int withEditorial,
            int withSpecialTag) {
    }
}
