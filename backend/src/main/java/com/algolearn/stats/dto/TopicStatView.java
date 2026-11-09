package com.algolearn.stats.dto;

import com.algolearn.common.web.IsoTime;
import com.algolearn.stats.LastResult;
import com.algolearn.stats.calc.TopicStatDoc;
import java.util.List;

/** Public shape of a topic stat (legacy toTopicStatView): no ids; {@code tags} lists the key's tag(s). */
public record TopicStatView(String topicKey, String kind, List<String> tags, int attempted, int solved, int failed,
        double strength, Integer comfortRating, Integer avgSolvedRating, Integer maxSolvedRating,
        String lastActivityAt, List<LastResult> lastResults) {

    public TopicStatView {
        tags = List.copyOf(tags);
        lastResults = List.copyOf(lastResults);
    }

    public static TopicStatView of(TopicStatDoc doc) {
        return new TopicStatView(doc.topicKey(), doc.kind(), List.of(doc.topicKey().split("\\+")), doc.attempted(),
                doc.solved(), doc.failed(), doc.strength(), doc.comfortRating(), doc.avgSolvedRating(),
                doc.maxSolvedRating(), doc.lastActivityAt() == null ? null : IsoTime.format(doc.lastActivityAt()),
                doc.lastResults());
    }
}
