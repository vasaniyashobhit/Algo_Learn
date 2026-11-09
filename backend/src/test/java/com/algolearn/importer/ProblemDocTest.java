package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/** Ports legacy derivedFields.test.js (tag count and a non-blank editorial). */
class ProblemDocTest {

    private static ProblemDoc withEditorial(String editorial, List<String> tags) {
        var text = new ProblemDoc.Text("d", "", "", "", editorial);
        return ProblemDoc.of("1/A", 1, "A", "T", text, null, tags, ProblemDoc.SOURCE_HF);
    }

    @Test
    void countsTagsAndDetectsANonBlankEditorial() {
        var doc = withEditorial("Use prefix sums.", List.of("dp", "math"));
        assertThat(doc.tagCount()).isEqualTo(2);
        assertThat(doc.hasEditorial()).isTrue();
    }

    @Test
    void treatsABlankOrMissingEditorialAsNone() {
        assertThat(withEditorial("   ", List.of()).hasEditorial()).isFalse();
        assertThat(withEditorial(null, List.of("dp")).hasEditorial()).isFalse();
        assertThat(ProblemDoc.of("1/A", 1, "A", "T", ProblemDoc.Text.EMPTY, null, List.of(), "cf_api"))
                .satisfies(doc -> {
                    assertThat(doc.tagCount()).isZero();
                    assertThat(doc.hasEditorial()).isFalse();
                });
    }

    @Test
    void copiesTheTagList() {
        var tags = new java.util.ArrayList<>(List.of("dp"));
        var doc = withEditorial("", tags);
        tags.add("math");
        assertThat(doc.tags()).containsExactly("dp");
    }
}
