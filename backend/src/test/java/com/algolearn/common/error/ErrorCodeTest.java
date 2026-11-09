package com.algolearn.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class ErrorCodeTest {

    private static final Path ROOT = Path.of("..");

    private static List<String> matches(Path file, String regex) throws IOException {
        var text = Files.readString(ROOT.resolve(file));
        return Pattern.compile(regex, Pattern.MULTILINE).matcher(text).results().map(m -> m.group(1)).toList();
    }

    private static List<String> enumNames() {
        return Arrays.stream(ErrorCode.values()).map(Enum::name).toList();
    }

    @Test
    void containsExactlyThe27AgreedCodes() {
        assertThat(enumNames()).hasSize(27).contains("DB_UNAVAILABLE", "INTERNAL_ERROR", "ROUTE_NOT_FOUND");
    }

    @Test
    void matchesTheErrorCodeTableInDocsApiMd() throws IOException {
        var documented = matches(Path.of("docs/API.md"), "^\\| `([A-Z_]+)` \\| \\d");
        assertThat(documented).containsExactlyInAnyOrderElementsOf(enumNames());
    }

    @Test
    void matchesTheFrontendCopy() throws IOException {
        var frontend = matches(Path.of("frontend/src/errors/codes.js"), "^\\s+'([A-Z_]+)',$");
        assertThat(frontend).containsExactlyElementsOf(enumNames());
    }
}
