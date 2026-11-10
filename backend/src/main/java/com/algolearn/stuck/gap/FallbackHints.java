package com.algolearn.stuck.gap;

import com.algolearn.common.validation.JsText;
import com.algolearn.stuck.StuckConstants;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/** Legacy fallbackHints: hints without AI (never empty). */
public final class FallbackHints {

    static final String GENERIC = "Start from the constraints: they tell you which time complexity the intended "
            + "solution needs.";
    private static final int MAX_PARAGRAPH = 500;

    private FallbackHints() {
    }

    /** First non-empty paragraph of an editorial (500 chars max, "…" when cut), or null. */
    public static String firstParagraph(String editorial) {
        var paragraph = Arrays.stream((editorial == null ? "" : editorial).split("\\n\\s*\\n"))
                .map(JsText::trim).filter(p -> !p.isEmpty()).findFirst().orElse(null);
        if (paragraph == null) {
            return null;
        }
        return paragraph.length() > MAX_PARAGRAPH ? paragraph.substring(0, MAX_PARAGRAPH - 1) + "…" : paragraph;
    }

    /** The likely topics, the weakest single gap topic to review, and the editorial's first paragraph. */
    public static List<String> of(List<String> tags, List<GapTopic> gapItems, String editorial) {
        var hints = new ArrayList<String>();
        if (!tags.isEmpty()) {
            hints.add("This problem most likely uses "
                    + tags.stream().map(GapAnalysis::label).collect(Collectors.joining(", ")) + ".");
        }
        gapItems.stream().filter(item -> "single".equals(item.kind())).findFirst().ifPresent(weakest ->
                hints.add("Review " + GapAnalysis.label(weakest.topicKey()) + " first. " + weakest.message()));
        var paragraph = firstParagraph(editorial);
        if (paragraph != null) {
            hints.add("From the editorial: " + paragraph);
        }
        if (hints.isEmpty()) {
            hints.add(GENERIC);
        }
        return List.copyOf(hints.subList(0, Math.min(hints.size(), StuckConstants.MAX_HINTS)));
    }
}
