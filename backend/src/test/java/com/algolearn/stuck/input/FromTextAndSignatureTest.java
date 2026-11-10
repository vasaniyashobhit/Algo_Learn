package com.algolearn.stuck.input;

import static com.algolearn.stuck.StuckFixtures.JPEG;
import static com.algolearn.stuck.StuckFixtures.PNG;
import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static com.algolearn.stuck.StuckFixtures.WEBP;
import static com.algolearn.stuck.StuckFixtures.makePdf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ValidationException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Legacy fromText.test.js and fileSignature.test.js. */
class FromTextAndSignatureTest {

    @Test
    void returnsTheTidiedTextCappedAt20000() {
        assertThat(FromText.read("  " + STATEMENT + "\r\n\r\n\r\n")).isEqualTo(STATEMENT);
        assertThat(FromText.read("x".repeat(25_000))).hasSize(20_000);
    }

    @Test
    void rejectsTextUnder40CharactersAfterTrimming() {
        var error = catchThrowableOfType(ValidationException.class, () -> FromText.read("   " + "a".repeat(39) + "  "));
        assertThat(error.status().value()).isEqualTo(400);
        assertThat(error.code()).isEqualTo(ErrorCode.PROBLEM_TEXT_TOO_SHORT);
        assertThat(error.details()).isEqualTo(Map.of("minLength", 40, "length", 39));
        assertThat(catchThrowableOfType(ValidationException.class, () -> FromText.read(null)).code())
                .isEqualTo(ErrorCode.PROBLEM_TEXT_TOO_SHORT);
    }

    @Test
    void acceptsExactlyTheMinimumAndTakesACustomMinimum() {
        assertThat(FromText.assertLongEnough("a".repeat(40), 40)).hasSize(40);
        assertThat(catchThrowableOfType(ValidationException.class, () -> FromText.assertLongEnough("abc", 5))
                .getMessage()).contains("at least 5");
    }

    @Test
    void acceptsFilesWhoseBytesMatchTheDeclaredType() {
        assertThat(FileSignature.matches(makePdf(), "application/pdf")).isTrue();
        assertThat(FileSignature.matches(PNG, "image/png")).isTrue();
        assertThat(FileSignature.matches(JPEG, "image/jpeg")).isTrue();
        assertThat(FileSignature.matches(WEBP, "image/webp")).isTrue();
        assertThat(FileSignature.matches("plain text".getBytes(StandardCharsets.UTF_8), "text/plain")).isTrue();
    }

    @Test
    void rejectsSpoofedTypesBinaryTextUnknownTypesAndEmptyFiles() {
        assertThat(FileSignature.matches(PNG, "application/pdf")).isFalse();
        assertThat(FileSignature.matches(makePdf(), "image/png")).isFalse();
        assertThat(FileSignature.matches(JPEG, "image/webp")).isFalse();
        assertThat(FileSignature.matches(new byte[] {0x41, 0, 0x42}, "text/plain")).isFalse();
        assertThat(FileSignature.matches(PNG, "image/gif")).isFalse();
        assertThat(FileSignature.matches(new byte[0], "text/plain")).isFalse();
        assertThat(FileSignature.matches(null, "image/png")).isFalse();
        assertThat(FileSignature.matches(PNG, null)).isFalse();
        assertThat(FileSignature.matches(new byte[] {(byte) 0xff, (byte) 0xd8}, "image/jpeg")).isFalse();
    }
}
