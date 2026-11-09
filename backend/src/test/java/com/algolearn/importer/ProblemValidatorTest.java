package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Ports legacy validateProblemDoc.test.js. */
class ProblemValidatorTest {

    static ProblemDoc doc(String id, Integer contestId, String index, String title, List<String> tags) {
        return new ProblemDoc(id, contestId, index, title, "", "", "", "", "", null, tags, tags.size(), false, "hf");
    }

    static ProblemDoc doc() {
        return doc("1/A", 1, "A", "T", List.of("dp"));
    }

    @Test
    void acceptsNormalMultiPartAndTheFourUnusualDatasetIds() {
        for (var id : List.of("1/A", "1950/F2", "1723/GP1", "1723/GP2", "921/01", "921/02")) {
            var parts = id.split("/");
            assertThat(ProblemValidator.rejectReason(doc(id, Integer.valueOf(parts[0]), parts[1], "T", List.of())))
                    .as(id).isEmpty();
        }
    }

    @Test
    void rejectsBadIds() {
        assertThat(ProblemValidator.rejectReason(doc("1A", 1, "A", "T", List.of()))).contains("invalidId");
        assertThat(ProblemValidator.rejectReason(doc("1/ABCD", 1, "ABCD", "T", List.of()))).contains("invalidId");
        assertThat(ProblemValidator.rejectReason(doc("1/a", 1, "a", "T", List.of()))).contains("invalidId");
    }

    @Test
    void rejectsBadContestIdsIdMismatchesMissingTitlesAndUnknownTags() {
        assertThat(ProblemValidator.rejectReason(doc("1/A", null, "A", "T", List.of()))).contains("invalidContestId");
        assertThat(ProblemValidator.rejectReason(doc("0/A", 0, "A", "T", List.of()))).contains("invalidContestId");
        assertThat(ProblemValidator.rejectReason(doc("1/A", 2, "A", "T", List.of()))).contains("idMismatch");
        assertThat(ProblemValidator.rejectReason(doc("1/A", 1, "A", "", List.of()))).contains("missingTitle");
        assertThat(ProblemValidator.rejectReason(doc("1/A", 1, "A", "T", List.of("dp", "magic"))))
                .contains("unknownTag");
        assertThat(ProblemValidator.rejectReason(doc("1/A", 1, "A", "T", List.of("*special")))).isEmpty();
    }

    @Test
    void splitsValidDocsFromRejectedOnesWithCountsPerReason() {
        var result = ProblemValidator.partition(List.of(doc(), doc("x", 1, "A", "T", List.of()),
                doc("y", 1, "A", "T", List.of()), doc("1/A", 1, "A", "", List.of())));
        assertThat(result.valid()).hasSize(1);
        assertThat(result.rejected()).isEqualTo(Map.of("invalidId", 2, "missingTitle", 1));
        assertThat(result.rejectedIds()).containsExactly("x", "y", "1/A");
    }

    @Test
    void samplesAtMost20RejectedIds() {
        var docs = java.util.stream.IntStream.range(0, 25).mapToObj(i -> doc("bad" + i, 1, "A", "T", List.of()))
                .toList();
        var result = ProblemValidator.partition(docs);
        assertThat(result.rejectedIds()).hasSize(25);
        assertThat(result.sampleIds()).hasSize(20).startsWith("bad0");
    }
}
