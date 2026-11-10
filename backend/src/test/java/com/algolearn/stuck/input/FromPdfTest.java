package com.algolearn.stuck.input;

import static com.algolearn.stuck.StuckFixtures.makePdf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.UnprocessableException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Legacy fromPdf.test.js (unpdf → PDFBox). */
class FromPdfTest {

    private static final byte[] HEADER = "%PDF-".getBytes(StandardCharsets.ISO_8859_1);

    private static void expectUnreadable(UnprocessableException error) {
        assertThat(error.status().value()).isEqualTo(422);
        assertThat(error.code()).isEqualTo(ErrorCode.INPUT_UNREADABLE);
        assertThat(error.details()).isEqualTo(Map.of("inputType", "pdf"));
    }

    @Test
    void readsARealPdfWithPdfBox() {
        assertThat(new FromPdf(PdfText.PDFBOX).read(makePdf("Theatre Square in Berland")))
                .isEqualTo("Theatre Square in Berland");
    }

    @Test
    void mergesPagesAndTidiesTheText() {
        assertThat(new FromPdf(bytes -> "  Page one  \n\n\n\nPage two ").read(HEADER))
                .isEqualTo("Page one\n\nPage two");
    }

    @Test
    void capsTheTextAt20000Characters() {
        assertThat(new FromPdf(bytes -> "y".repeat(30_000)).read(HEADER)).hasSize(20_000);
    }

    @Test
    void mapsAnEmptyPdfToInputUnreadable() {
        expectUnreadable(catchThrowableOfType(UnprocessableException.class,
                () -> new FromPdf(bytes -> " \n ").read(HEADER)));
        expectUnreadable(catchThrowableOfType(UnprocessableException.class,
                () -> new FromPdf(bytes -> null).read(HEADER)));
    }

    @Test
    void mapsABrokenPdfToInputUnreadableWithTheCause() {
        var error = catchThrowableOfType(UnprocessableException.class, () -> new FromPdf(PdfText.PDFBOX)
                .read("%PDF-1.4 garbage".getBytes(StandardCharsets.ISO_8859_1)));
        expectUnreadable(error);
        assertThat(error.getCause()).isInstanceOf(IOException.class);
        var failing = catchThrowableOfType(UnprocessableException.class, () -> new FromPdf(bytes -> {
            throw new IllegalStateException("boom");
        }).read(HEADER));
        assertThat(failing.getCause()).hasMessage("boom");
    }
}
