package com.algolearn.stuck.input;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.UnprocessableException;
import com.algolearn.stuck.StuckConstants;
import java.io.IOException;
import java.util.Map;

/** Legacy fromPdf: PDF bytes → tidied text (capped); empty or broken PDFs → 422 INPUT_UNREADABLE. */
public class FromPdf {

    private final PdfText pdfText;

    public FromPdf(PdfText pdfText) {
        this.pdfText = pdfText;
    }

    public String read(byte[] pdf) {
        String text;
        try {
            text = pdfText.extract(pdf);
        } catch (IOException | RuntimeException e) {
            throw unreadable(e);
        }
        var clean = TextTidy.tidy(text);
        if (clean.isEmpty()) {
            throw unreadable(null);
        }
        return TextTidy.cap(clean, StuckConstants.MAX_TEXT_LENGTH);
    }

    static UnprocessableException unreadable(Throwable cause) {
        return new UnprocessableException(ErrorCode.INPUT_UNREADABLE, "No text could be read from this PDF. If it is "
                + "a scan, upload a screenshot or paste the text instead.", Map.of("inputType", "pdf"), cause);
    }
}
