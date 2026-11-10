package com.algolearn.stuck.input;

import java.io.IOException;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;

/** Text layer of a PDF, all pages merged (legacy unpdf extractText with mergePages). Tests inject fakes. */
@FunctionalInterface
public interface PdfText {

    /** PDFBox: throws IOException for a broken PDF; a scan has no text layer and gives ''. */
    PdfText PDFBOX = bytes -> {
        try (var document = Loader.loadPDF(bytes)) {
            return new PDFTextStripper().getText(document);
        }
    };

    String extract(byte[] pdf) throws IOException;
}
