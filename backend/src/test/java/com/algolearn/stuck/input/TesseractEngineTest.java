package com.algolearn.stuck.input;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.stuck.TextPng;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Legacy ocr.real.test.js: real Tesseract when it is installed (the Docker image), otherwise every call is an
 * {@link OcrEngine.OcrFailure} that the stuck flow counts as "OCR found no text" (a Windows dev machine).
 */
class TesseractEngineTest {

    @Test
    void findsTheFirstFolderWithEnglishData(@TempDir Path dir) throws IOException {
        var empty = Files.createDirectory(dir.resolve("empty"));
        var data = Files.createDirectory(dir.resolve("data"));
        Files.writeString(data.resolve("eng.traineddata"), "x");
        assertThat(TesseractEngine.findDataDir(Optional.of(empty.toString()), List.of(data.toString())))
                .contains(data);
        assertThat(TesseractEngine.findDataDir(Optional.of(data.toString()), List.of())).contains(data);
        assertThat(TesseractEngine.findDataDir(Optional.empty(), List.of(empty.toString()))).isEmpty();
    }

    @Test
    void failsCleanlyWithoutEnglishData(@TempDir Path dir) {
        var engine = new TesseractEngine(Optional.of(dir.toString()));
        if (engine.isAvailable()) {
            return;
        }
        var error = catchThrowableOfType(OcrEngine.OcrFailure.class, () -> engine.recognize(new byte[] {1}));
        assertThat(error).hasMessageContaining("not installed");
    }

    @Test
    void readsAGeneratedScreenshotOrFailsWhenTesseractIsMissing() {
        var engine = new TesseractEngine(Optional.ofNullable(System.getenv("TESSDATA_PREFIX")));
        var png = TextPng.of(List.of("A. Theatre Square", "Find the least number of flagstones."));
        if (engine.isAvailable()) {
            assertThat(engine.recognize(png)).containsIgnoringCase("Theatre Square");
        } else {
            assertThat(catchThrowableOfType(OcrEngine.OcrFailure.class, () -> engine.recognize(png))).isNotNull();
        }
    }

    @Test
    void refusesBytesThatAreNotAnImage(@TempDir Path dir) throws IOException {
        Files.writeString(dir.resolve("eng.traineddata"), "not real data");
        var engine = new TesseractEngine(Optional.of(dir.toString()));
        assertThat(catchThrowableOfType(OcrEngine.OcrFailure.class, () -> engine.recognize(new byte[] {1, 2})))
                .hasMessageContaining("cannot be decoded");
    }
}
