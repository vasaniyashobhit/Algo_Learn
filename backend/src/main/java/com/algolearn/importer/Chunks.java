package com.algolearn.importer;

import java.util.List;
import java.util.stream.IntStream;

/** Splits a list into fixed-size batches (the last one may be smaller). */
public final class Chunks {

    private Chunks() {
    }

    public static <T> List<List<T>> of(List<T> items, int size) {
        if (size < 1) {
            throw new IllegalArgumentException("size must be a positive integer");
        }
        var count = (items.size() + size - 1) / size;
        return IntStream.range(0, count)
                .mapToObj(i -> List.copyOf(items.subList(i * size, Math.min(items.size(), (i + 1) * size))))
                .toList();
    }
}
