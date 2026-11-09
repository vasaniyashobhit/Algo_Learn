package com.algolearn.recommendations.calc;

import com.algolearn.common.validation.JsText;
import com.algolearn.recommendations.RecommendationConstants;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/** Legacy solvedCopies.js: the same problem, or a Div1/Div2 copy of it. */
public final class SolvedCopies {

    private SolvedCopies() {
    }

    /** Trimmed, inner whitespace collapsed, lower-cased ("" for null). */
    public static String normalizeTitle(String title) {
        return title == null ? "" : JsText.lower(JsText.trim(title).replaceAll("(?U)\\s+", " "));
    }

    /** Same id, or the same non-empty title (case-insensitive) in a contest at most {@code gap} ids away. */
    public static boolean isSameOrCopy(ProblemRef a, ProblemRef b, int gap) {
        if (a.id().equals(b.id())) {
            return true;
        }
        var title = normalizeTitle(a.title());
        return !title.isEmpty() && title.equals(normalizeTitle(b.title()))
                && a.contestId() != null && b.contestId() != null && Math.abs(a.contestId() - b.contestId()) <= gap;
    }

    public static boolean isSameOrCopy(ProblemRef a, ProblemRef b) {
        return isSameOrCopy(a, b, RecommendationConstants.COPY_CONTEST_GAP);
    }

    /** True for a solved id or a copy of a solved problem. */
    public static Predicate<ProblemRef> matcher(List<ProblemRef> solved) {
        var ids = new HashSet<String>();
        Map<String, List<ProblemRef>> byTitle = new LinkedHashMap<>();
        for (var ref : solved) {
            ids.add(ref.id());
            var title = normalizeTitle(ref.title());
            if (!title.isEmpty()) {
                byTitle.computeIfAbsent(title, k -> new ArrayList<>()).add(ref);
            }
        }
        return problem -> ids.contains(problem.id()) || byTitle.getOrDefault(normalizeTitle(problem.title()),
                List.of()).stream().anyMatch(s -> isSameOrCopy(problem, s));
    }

    /** {@code { id, title, contestId }}; title and contest may be unknown for a problem not imported. */
    public record ProblemRef(String id, String title, Integer contestId) {
    }
}
