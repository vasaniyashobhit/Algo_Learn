package com.algolearn.stuck.input;

/**
 * What the input readers produced: the statement {@code text} and/or the Codeforces {@code problemId} (either may
 * be null), the raw input to store, and for images which reader found the text ({@code ai} / {@code ocr}).
 */
public record ResolvedInput(String text, String problemId, String rawInput, String reader) {
}
