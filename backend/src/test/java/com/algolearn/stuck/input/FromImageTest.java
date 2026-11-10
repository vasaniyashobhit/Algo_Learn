package com.algolearn.stuck.input;

import static com.algolearn.stuck.StuckFixtures.PNG;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.UnprocessableException;
import com.algolearn.llm.FakeLimiter;
import com.algolearn.llm.ImageText;
import com.algolearn.llm.LlmFakes;
import com.algolearn.llm.LogCapture;
import com.algolearn.llm.chain.LlmException;
import com.algolearn.support.MutableClock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Legacy fromImage.test.js: Gemini first (≤ 20 s of the deadline), then OCR (≤ 15 s), else INPUT_UNREADABLE. */
class FromImageTest {

    private final MutableClock clock = LlmFakes.clockAt(0);
    private final List<Instant> aiDeadlines = new ArrayList<>();
    private final FakeLimiter limiter = new FakeLimiter(clock);

    private FromImage reader(String ai, OcrEngine ocr) {
        return new FromImage((image, mime, deadline) -> {
            aiDeadlines.add(deadline);
            return Optional.ofNullable(ai).map(text -> new ImageText(text, "gemini", "a"));
        }, new Ocr(ocr, limiter), clock);
    }

    @Test
    void usesGeminiFirstCappedAt20SecondsOfTheSharedDeadline() {
        var read = reader(" A. Theatre Square ", image -> "never").read(PNG, "image/png", Instant.ofEpochMilli(50_000));
        assertThat(read).isEqualTo(new FromImage.Read("A. Theatre Square", "ai"));
        assertThat(aiDeadlines).containsExactly(Instant.ofEpochMilli(20_000));
        assertThat(limiter.limits).isEmpty();
    }

    @Test
    void givesGeminiOnlyTheTimeLeftAndDefaultsTo50Seconds() {
        reader("x", image -> "").read(PNG, "image/png", Instant.ofEpochMilli(7_000));
        clock.set(Instant.ofEpochMilli(100));
        reader("x", image -> "").read(PNG, "image/png", null);
        assertThat(aiDeadlines).containsExactly(Instant.ofEpochMilli(7_000), Instant.ofEpochMilli(20_100));
    }

    @Test
    void fallsBackToOcrWithAtMost15SecondsNeverPastTheDeadline() {
        var fromImage = reader(null, image -> "OCR text\n\n\n\nmore");
        assertThat(fromImage.read(PNG, "image/png", Instant.ofEpochMilli(50_000)))
                .isEqualTo(new FromImage.Read("OCR text\n\nmore", "ocr"));
        clock.set(Instant.ofEpochMilli(44_000));
        fromImage.read(PNG, "image/png", Instant.ofEpochMilli(50_000));
        assertThat(limiter.limits).containsExactly(15_000L, 6_000L);
    }

    @Test
    void treatsABlankTranscriptionLikeNoneAndCapsBothReadersAt20000() {
        assertThat(reader("   ", image -> "from ocr").read(PNG, "image/png", null).reader()).isEqualTo("ocr");
        assertThat(reader("a".repeat(30_000), image -> "").read(PNG, "image/png", null).text()).hasSize(20_000);
        assertThat(reader(null, image -> "b".repeat(30_000)).read(PNG, "image/png", null).text()).hasSize(20_000);
    }

    @Test
    void throwsInputUnreadableWhenBothAreEmpty() {
        var error = catchThrowableOfType(UnprocessableException.class,
                () -> reader(null, image -> "").read(PNG, "image/png", null));
        assertThat(error.status().value()).isEqualTo(422);
        assertThat(error.code()).isEqualTo(ErrorCode.INPUT_UNREADABLE);
        assertThat(error.details()).isEqualTo(Map.of("inputType", "image"));
    }

    @Test
    void logsAnOcrTimeoutOrMissingTesseractAndKeepsItAsTheCause() {
        try (var logs = new LogCapture(FromImage.class)) {
            var hang = catchThrowableOfType(UnprocessableException.class, () -> reader(null, image -> {
                throw new FakeLimiter.Hang();
            }).read(PNG, "image/png", null));
            assertThat(hang.getCause()).isInstanceOf(LlmException.class);
            var missing = catchThrowableOfType(UnprocessableException.class, () -> reader(null, image -> {
                throw new OcrEngine.OcrFailure("Tesseract English data is not installed", null);
            }).read(PNG, "image/png", null));
            assertThat(missing.getCause()).isInstanceOf(OcrEngine.OcrFailure.class);
            assertThat(logs.messages("WARN")).allMatch(line -> line.startsWith("OCR failed")).hasSize(2);
        }
    }
}
