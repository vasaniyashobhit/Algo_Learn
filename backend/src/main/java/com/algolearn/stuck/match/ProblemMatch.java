package com.algolearn.stuck.match;

import com.algolearn.common.validation.JsText;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Legacy problemMatch helpers: find the stored problem a pasted statement belongs to. */
public final class ProblemMatch {

    private static final int SEARCH_CHARS = 600;
    private static final int SNIPPET_MIN = 80;
    private static final int SNIPPET_LENGTH = 200;
    private static final Pattern SPACES = Pattern.compile("(?U)\\s+");
    private static final Pattern INDEX_PREFIX = Pattern.compile("(?U)^\\d{0,6}[A-Z]\\d?\\s*[.:)\\-–]\\s+");

    private ProblemMatch() {
    }

    public static String normalize(String text) {
        var nfkc = Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFKC);
        return JsText.trim(SPACES.matcher(JsText.lower(nfkc)).replaceAll(" "));
    }

    public static String firstLine(String text) {
        return Arrays.stream((text == null ? "" : text).split("\n")).map(JsText::trim).filter(l -> !l.isEmpty())
                .findFirst().orElse("");
    }

    /** "A. Theatre Square" / "1A - Theatre Square" / "B1) X" → the title without the index prefix. */
    public static String stripIndexPrefix(String line) {
        return INDEX_PREFIX.matcher(line).replaceFirst("");
    }

    /** The statement's first characters without quotes or minus signs (phrase / negation in text search). */
    public static String searchQuery(String text) {
        var head = text == null ? "" : text.length() > SEARCH_CHARS ? text.substring(0, SEARCH_CHARS) : text;
        return JsText.trim(SPACES.matcher(head.replaceAll("[\"-]", " ")).replaceAll(" "));
    }

    /**
     * The candidate whose title equals the statement's first line (index prefix, case and spaces ignored), or whose
     * description start (≥ 80 normalized chars) the statement contains.
     */
    public static Optional<StuckProblem> findExactMatch(String text, List<StuckProblem> candidates) {
        var title = normalize(stripIndexPrefix(firstLine(text)));
        var body = normalize(text);
        return candidates.stream().filter(problem -> {
            if (!title.isEmpty() && normalize(problem.title()).equals(title)) {
                return true;
            }
            var snippet = snippetOf(problem);
            return snippet != null && body.contains(snippet);
        }).findFirst();
    }

    private static String snippetOf(StuckProblem problem) {
        var body = normalize(problem.description());
        return body.length() >= SNIPPET_MIN ? body.substring(0, Math.min(SNIPPET_LENGTH, body.length())) : null;
    }

    /** The statement of a stored problem, used to ask the coach about a problem found by id. */
    public static String statementOf(StuckProblem p) {
        return Stream.of(p.title(), p.description(), section("Input", p.inputFormat()),
                        section("Output", p.outputFormat()), section("Note", p.note()))
                .filter(Objects::nonNull).filter(s -> !s.isEmpty()).collect(Collectors.joining("\n\n"));
    }

    private static String section(String heading, String text) {
        return text == null || text.isEmpty() ? null : heading + "\n" + text;
    }
}
