package com.algolearn.importer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;

/** Ports the chunk case of legacy bulkUpsert.test.js. */
class ChunksTest {

    @Test
    void splitsIntoFixedSizeBatchesAndValidatesTheSize() {
        assertThat(Chunks.of(List.of(1, 2, 3, 4, 5), 2)).containsExactly(List.of(1, 2), List.of(3, 4), List.of(5));
        assertThat(Chunks.of(List.of(), 500)).isEmpty();
        assertThatThrownBy(() -> Chunks.of(List.of(1), 0)).isInstanceOf(IllegalArgumentException.class);
    }
}
