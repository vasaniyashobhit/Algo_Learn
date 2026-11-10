package com.algolearn.llm.schema;

import java.util.Set;
import java.util.regex.Pattern;

/**
 * A cheap shape check of the model's C++ (Session 7 decision, not legacy): the program needs at least one
 * {@code #include} line, and every line starting with {@code #} must be a known preprocessor directive. It does not
 * compile anything; it only catches answers like a stray "# Solution" heading or prose instead of code.
 */
public final class CppCheck {

    static final Set<String> DIRECTIVES = Set.of("include", "define", "pragma", "if", "ifdef", "ifndef", "else",
            "elif", "endif");
    private static final Pattern DIRECTIVE = Pattern.compile("^#\\s*([A-Za-z_]*)");

    private CppCheck() {
    }

    public static boolean isWellFormed(String code) {
        if (code == null || code.isBlank()) {
            return false;
        }
        var hasInclude = false;
        for (var line : code.split("\\R")) {
            var trimmed = line.stripLeading();
            if (!trimmed.startsWith("#")) {
                continue;
            }
            var match = DIRECTIVE.matcher(trimmed);
            var name = match.find() ? match.group(1) : "";
            if (!DIRECTIVES.contains(name)) {
                return false;
            }
            hasInclude |= name.equals("include");
        }
        return hasInclude;
    }
}
