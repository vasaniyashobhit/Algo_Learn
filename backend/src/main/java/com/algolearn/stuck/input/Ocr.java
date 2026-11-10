package com.algolearn.stuck.input;

import com.algolearn.common.validation.JsText;
import com.algolearn.llm.chain.LlmException;
import com.algolearn.llm.chain.TimeLimiter;
import com.algolearn.stuck.StuckConstants;

/**
 * Legacy createOcr.recognize: OCR with a hard limit of min(timeoutMs, {@link StuckConstants#OCR_TIMEOUT_MS})
 * through the time limiter (a call that overruns is cancelled). No time left → timeout at once, without
 * starting OCR. Returns the trimmed text; throws on failure or timeout.
 */
public class Ocr implements AutoCloseable {

    private final OcrEngine engine;
    private final TimeLimiter limiter;
    private final long maxTimeoutMs;

    public Ocr(OcrEngine engine, TimeLimiter limiter, long maxTimeoutMs) {
        this.engine = engine;
        this.limiter = limiter;
        this.maxTimeoutMs = maxTimeoutMs;
    }

    public Ocr(OcrEngine engine, TimeLimiter limiter) {
        this(engine, limiter, StuckConstants.OCR_TIMEOUT_MS);
    }

    /** Stops the limiter's executor when it owns one. */
    @Override
    public void close() throws Exception {
        if (limiter instanceof AutoCloseable closeable) {
            closeable.close();
        }
    }

    public String recognize(byte[] image, long timeoutMs) {
        var limit = Math.min(timeoutMs, maxTimeoutMs);
        if (limit <= 0) {
            throw LlmException.timeout(0);
        }
        var text = limiter.call(limit, () -> engine.recognize(image));
        return JsText.trim(text == null ? "" : text);
    }
}
