package com.algolearn.stuck.gap;

import java.util.List;

/** The concept gap: summary {@code message}, the gap {@code items} (weak + unseen) and every {@code topics} key. */
public record Gap(String message, List<GapTopic> items, List<GapTopic> topics) {

    public Gap {
        items = List.copyOf(items);
        topics = List.copyOf(topics);
    }
}
