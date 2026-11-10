package com.algolearn.stuck;

import java.util.List;

/**
 * Stuck flow constants (legacy stuckConstants.js). One shared deadline per POST /stuck: Gemini image reading
 * gets at most {@link #IMAGE_MAX_MS}, OCR at most {@link #OCR_TIMEOUT_MS}, the coach whatever is left (skipped for
 * the fallback below {@link #COACH_MIN_MS}).
 */
public final class StuckConstants {

    public static final int MIN_TEXT_LENGTH = 40;
    public static final int MAX_TEXT_LENGTH = 20_000;
    public static final int MAX_URL_LENGTH = 2_048;
    public static final long URL_TIMEOUT_MS = 8_000;
    public static final int URL_MAX_BYTES = 2 * 1024 * 1024;
    public static final int URL_MAX_REDIRECTS = 3;
    public static final long UPLOAD_MAX_BYTES = 5L * 1024 * 1024;
    public static final List<String> UPLOAD_MIME_TYPES =
            List.of("application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain");
    public static final String OCR_LANGUAGE = "eng";
    public static final long REQUEST_DEADLINE_MS = 50_000;
    public static final long IMAGE_MAX_MS = 20_000;
    public static final long OCR_TIMEOUT_MS = 15_000;
    public static final long COACH_MIN_MS = 10_000;
    public static final int NEIGHBORS = 5;
    public static final int MAX_NEIGHBOR_TAGS = 4;
    public static final int SIMILAR_K = 10;
    public static final int EASIER_BY = 150;
    public static final int MAX_HINTS = 3;
    public static final int HISTORY_LIMIT = 20;
    public static final int RATE_LIMIT = 10;
    public static final long RATE_WINDOW_MS = 60 * 60_000;
    /** Gap status thresholds: strength below → weak, above → strong, else developing. */
    public static final double WEAK_BELOW = 0.4;
    public static final double STRONG_ABOVE = 0.7;
    public static final List<String> INPUT_TYPES = List.of("text", "url", "pdf", "image");
    public static final String FALLBACK_NOTICE = "AI solution temporarily unavailable. Here are the likely topics, "
            + "your weak areas, similar problems and editorials.";

    private StuckConstants() {
    }
}
