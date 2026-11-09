package com.algolearn.importer;

import java.util.List;

/**
 * A cleaned problem row ready to write: imported ("hf", with text) or from the Codeforces API
 * ("cf_api", empty text). {@code contestId} is null when the source value was not a number.
 */
public record ProblemDoc(String id, Integer contestId, String index, String title, String description,
        String inputFormat, String outputFormat, String note, String editorial, Integer rating, List<String> tags,
        int tagCount, boolean hasEditorial, String source) {

    public static final String SOURCE_HF = "hf";
    public static final String SOURCE_CF_API = "cf_api";

    public ProblemDoc {
        tags = List.copyOf(tags);
    }

    /** The derived fields (legacy problemDerivedFields): tag count and a non-blank editorial. */
    static ProblemDoc of(String id, Integer contestId, String index, String title, Text text, Integer rating,
            List<String> tags, String source) {
        var hasEditorial = text.editorial() != null && !text.editorial().isBlank();
        return new ProblemDoc(id, contestId, index, title, text.description(), text.inputFormat(),
                text.outputFormat(), text.note(), text.editorial(), rating, tags, tags.size(), hasEditorial, source);
    }

    /** Statement text fields; {@link #EMPTY} for problems from the Codeforces API. */
    record Text(String description, String inputFormat, String outputFormat, String note, String editorial) {

        static final Text EMPTY = new Text("", "", "", "", "");
    }
}
