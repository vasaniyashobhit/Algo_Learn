package com.algolearn.stuck.input;

/** One OCR run on an image, without a time limit ({@link Ocr} adds it). Throws when it cannot read. */
@FunctionalInterface
public interface OcrEngine {

    /** The recognised text (may be blank). */
    String recognize(byte[] image);

    /** Raised when OCR cannot run here (Tesseract or its English data not installed) or fails. */
    final class OcrFailure extends RuntimeException {

        private static final long serialVersionUID = 1L;

        public OcrFailure(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
