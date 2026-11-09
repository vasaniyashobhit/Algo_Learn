package com.algolearn.recommendations.calc;

import com.algolearn.stats.calc.TopicStatDoc;

/** Legacy topicReason.js: a short explanation built from the data. */
public final class TopicReason {

    private TopicReason() {
    }

    /** "22%", or "under 1%" for a tag that is present but rare. */
    public static String formatShare(double share) {
        var percent = Math.round(share * 100);
        return share > 0 && percent == 0 ? "under 1%" : percent + "%";
    }

    /** E.g. "You've solved 4 of 11 dp problems; dp shows up in 22% of problems at your level". */
    public static String of(String topic, TopicStatDoc stat, double share, int rating, boolean ratingKnown) {
        var level = ratingKnown ? "at your level" : "rated around " + rating;
        var shows = "%s shows up in %s of problems %s".formatted(topic, formatShare(share), level);
        if (stat == null || stat.attempted() == 0) {
            return "New topic for you: " + shows;
        }
        return "You've solved %d of %d %s problems; %s".formatted(stat.solved(), stat.attempted(), topic, shows);
    }
}
