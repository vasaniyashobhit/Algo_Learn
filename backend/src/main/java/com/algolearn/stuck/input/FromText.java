package com.algolearn.stuck.input;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ValidationException;
import com.algolearn.stuck.StuckConstants;
import java.util.LinkedHashMap;

/** Legacy fromText: pasted (or uploaded) text, tidied and capped, or PROBLEM_TEXT_TOO_SHORT. */
public final class FromText {

    private FromText() {
    }

    /** The text when it has at least {@code minLength} characters, else 400 PROBLEM_TEXT_TOO_SHORT. */
    public static String assertLongEnough(String text, int minLength) {
        if (text.length() >= minLength) {
            return text;
        }
        var details = new LinkedHashMap<String, Object>();
        details.put("minLength", minLength);
        details.put("length", text.length());
        throw new ValidationException(ErrorCode.PROBLEM_TEXT_TOO_SHORT,
                "Please paste at least %d characters of the problem statement".formatted(minLength), details);
    }

    public static String read(String raw) {
        var text = assertLongEnough(TextTidy.tidy(raw), StuckConstants.MIN_TEXT_LENGTH);
        return TextTidy.cap(text, StuckConstants.MAX_TEXT_LENGTH);
    }
}
