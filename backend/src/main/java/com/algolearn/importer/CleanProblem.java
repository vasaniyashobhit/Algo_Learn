package com.algolearn.importer;

import com.algolearn.config.Tags;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

/** Maps one dataset row to a problem document (legacy cleanProblem). */
public final class CleanProblem {

    private CleanProblem() {
    }

    /** Trims a string; null and non-strings become "". */
    public static String cleanText(Object value) {
        return value instanceof String text ? text.trim() : "";
    }

    /**
     * Integral numbers (Integer, Long, BigInteger, whole doubles) and numeric strings → Integer;
     * anything else (null, "", "abc", fractions, out of int range) → null.
     */
    public static Integer toIntOrNull(Object value) {
        var number = switch (value) {
            case null -> null;
            case Number n -> parse(n.toString());
            case String s -> parse(s.trim());
            default -> null;
        };
        return Optional.ofNullable(number).filter(CleanProblem::isInt).map(BigDecimal::intValueExact).orElse(null);
    }

    /** Trimmed, non-empty, de-duplicated tags in their original order; a non-list gives []. */
    public static List<String> cleanTags(Object tags) {
        if (!(tags instanceof List<?> list)) {
            return List.of();
        }
        var unique = new LinkedHashSet<String>();
        list.stream().map(CleanProblem::cleanText).filter(t -> !t.isEmpty()).forEach(unique::add);
        return List.copyOf(unique);
    }

    /**
     * The "hf" document for a row, or empty when its description is empty (the row is skipped).
     * {@code *special} stays in tags (a real CF tag); stats code leaves it out of topic scores.
     */
    public static Optional<ProblemDoc> clean(DatasetRow row) {
        var description = row == null ? "" : cleanText(row.description());
        if (description.isEmpty()) {
            return Optional.empty();
        }
        var text = new ProblemDoc.Text(description, cleanText(row.inputFormat()), cleanText(row.outputFormat()),
                cleanText(row.note()), cleanText(row.editorial()));
        return Optional.of(ProblemDoc.of(cleanText(row.id()), toIntOrNull(row.contestId()), cleanText(row.index()),
                cleanText(row.title()), text, toIntOrNull(row.rating()), cleanTags(row.tags()), ProblemDoc.SOURCE_HF));
    }

    public static boolean hasSpecialTag(ProblemDoc doc) {
        return doc.tags().contains(Tags.SPECIAL_TAG);
    }

    private static BigDecimal parse(String text) {
        try {
            return text.isEmpty() ? null : new BigDecimal(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static boolean isInt(BigDecimal number) {
        try {
            number.intValueExact();
            return true;
        } catch (ArithmeticException e) {
            return false;
        }
    }
}
