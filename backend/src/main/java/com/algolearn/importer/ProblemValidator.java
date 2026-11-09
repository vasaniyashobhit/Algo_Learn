package com.algolearn.importer;

import com.algolearn.config.ProblemIds;
import com.algolearn.config.Tags;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** The rules a cleaned document must pass before it is written (legacy validateProblemDoc). */
public final class ProblemValidator {

    private static final Set<String> KNOWN_TAGS = Set.copyOf(Tags.ALL_TAGS);

    private ProblemValidator() {
    }

    /** Why {@code doc} cannot be stored, or empty when it is fine. */
    public static Optional<String> rejectReason(ProblemDoc doc) {
        if (!ProblemIds.PROBLEM_ID_PATTERN.matcher(doc.id()).matches()) {
            return Optional.of("invalidId");
        }
        if (doc.contestId() == null || doc.contestId() < 1) {
            return Optional.of("invalidContestId");
        }
        if (!doc.id().equals(doc.contestId() + "/" + doc.index())) {
            return Optional.of("idMismatch");
        }
        if (doc.title().isEmpty()) {
            return Optional.of("missingTitle");
        }
        if (!KNOWN_TAGS.containsAll(doc.tags())) {
            return Optional.of("unknownTag");
        }
        return Optional.empty();
    }

    /** Splits docs into valid ones and {@code reason → count} (in first-seen order) with the rejected ids. */
    public static Partition partition(List<ProblemDoc> docs) {
        var valid = new ArrayList<ProblemDoc>();
        var rejected = new LinkedHashMap<String, Integer>();
        var rejectedIds = new ArrayList<String>();
        for (var doc : docs) {
            rejectReason(doc).ifPresentOrElse(reason -> {
                rejected.merge(reason, 1, Integer::sum);
                rejectedIds.add(doc.id());
            }, () -> valid.add(doc));
        }
        return new Partition(valid, rejected, rejectedIds);
    }

    /** Result of {@link #partition}. */
    public record Partition(List<ProblemDoc> valid, Map<String, Integer> rejected, List<String> rejectedIds) {

        /** Summaries list at most this many rejected ids. */
        public static final int SAMPLE_IDS = 20;

        public List<String> sampleIds() {
            return rejectedIds.subList(0, Math.min(SAMPLE_IDS, rejectedIds.size()));
        }
    }
}
