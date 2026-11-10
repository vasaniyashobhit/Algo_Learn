package com.algolearn.stuck.input;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.UnprocessableException;
import com.algolearn.llm.ImageText;
import com.algolearn.llm.chain.LlmException;
import com.algolearn.stuck.StuckConstants;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Legacy fromImage: Gemini ({@code extractImageText}, never throws) first, then OCR. Both draw from the shared
 * deadline: Gemini gets at most {@link StuckConstants#IMAGE_MAX_MS}, OCR at most
 * {@link StuckConstants#OCR_TIMEOUT_MS} (never past the deadline). An OCR failure, timeout or a missing Tesseract
 * install is logged and kept as the cause; no text from either → 422 INPUT_UNREADABLE.
 */
public class FromImage {

    private static final Logger LOG = LoggerFactory.getLogger(FromImage.class);

    private final ImageTextSource ai;
    private final Ocr ocr;
    private final Clock clock;

    public FromImage(ImageTextSource ai, Ocr ocr, Clock clock) {
        this.ai = ai;
        this.ocr = ocr;
        this.clock = clock;
    }

    /** Text and who read it ({@code ai} or {@code ocr}). {@code deadline} null = now + 50 s. */
    public Read read(byte[] image, String mimeType, Instant deadline) {
        var now = clock.millis();
        var until = deadline == null ? now + StuckConstants.REQUEST_DEADLINE_MS : deadline.toEpochMilli();
        var aiDeadline = Instant.ofEpochMilli(Math.min(until, now + StuckConstants.IMAGE_MAX_MS));
        var aiText = TextTidy.tidy(ai.extract(image, mimeType, aiDeadline).map(ImageText::text).orElse(""));
        if (!aiText.isEmpty()) {
            return new Read(TextTidy.cap(aiText, StuckConstants.MAX_TEXT_LENGTH), "ai");
        }
        var ocrText = "";
        RuntimeException cause = null;
        try {
            ocrText = TextTidy.tidy(ocr.recognize(image, until - clock.millis()));
        } catch (RuntimeException e) {
            cause = e;
            LOG.warn("OCR failed (err={})", LlmException.describe(e));
        }
        if (!ocrText.isEmpty()) {
            return new Read(TextTidy.cap(ocrText, StuckConstants.MAX_TEXT_LENGTH), "ocr");
        }
        throw new UnprocessableException(ErrorCode.INPUT_UNREADABLE, "No text could be read from this image. Try a "
                + "sharper screenshot or paste the text instead.", Map.of("inputType", "image"), cause);
    }

    /** The text an image held and which reader found it. */
    public record Read(String text, String reader) {
    }

    /** Gemini image reading ({@code Llm::extractImageText}). */
    @FunctionalInterface
    public interface ImageTextSource {
        Optional<ImageText> extract(byte[] image, String mimeType, Instant deadline);
    }
}
