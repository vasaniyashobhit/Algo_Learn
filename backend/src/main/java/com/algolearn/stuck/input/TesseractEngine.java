package com.algolearn.stuck.input;

import com.algolearn.stuck.StuckConstants;
import java.io.ByteArrayInputStream;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.awt.image.DataBufferByte;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import javax.imageio.ImageIO;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;

/**
 * Tesseract through Tess4J (English, LSTM engine). The data folder is {@code TESSDATA_PREFIX} or a standard
 * install path; without {@code eng.traineddata} (or the native library) every call fails with
 * {@link OcrEngine.OcrFailure}, which the stuck flow counts as "OCR found no text". A new Tesseract instance per
 * call (instances are not thread-safe). The picture goes to libtesseract as raw 8-bit gray pixels, not through
 * Lept4J: Tess4J's Lept4J needs a newer Leptonica than Ubuntu 24.04 ships (missing symbols at runtime).
 */
public class TesseractEngine implements OcrEngine {

    static final List<String> DATA_DIRS = List.of("/usr/share/tesseract-ocr/5/tessdata",
            "/usr/share/tesseract-ocr/4.00/tessdata", "/usr/share/tessdata", "/usr/local/share/tessdata",
            "C:/Program Files/Tesseract-OCR/tessdata");

    private static final int GRAY_BITS = 8;

    private final Optional<Path> dataDir;

    public TesseractEngine(Optional<String> tessdataPrefix) {
        this.dataDir = findDataDir(tessdataPrefix, DATA_DIRS);
    }

    /** The first folder holding {@code eng.traineddata}: the configured prefix first, then the defaults. */
    static Optional<Path> findDataDir(Optional<String> prefix, List<String> defaults) {
        return Stream.concat(prefix.stream(), defaults.stream()).map(Path::of)
                .filter(dir -> Files.isRegularFile(dir.resolve(StuckConstants.OCR_LANGUAGE + ".traineddata")))
                .findFirst();
    }

    public boolean isAvailable() {
        return dataDir.isPresent();
    }

    @Override
    public String recognize(byte[] image) {
        var dir = dataDir.orElseThrow(() -> new OcrFailure("Tesseract English data is not installed", null));
        try {
            var picture = ImageIO.read(new ByteArrayInputStream(image));
            if (picture == null) {
                throw new OcrFailure("The image format cannot be decoded for OCR", null);
            }
            var tesseract = new Tesseract();
            tesseract.setDatapath(dir.toString());
            tesseract.setLanguage(StuckConstants.OCR_LANGUAGE);
            tesseract.setOcrEngineMode(1);
            return tesseract.doOCR(picture.getWidth(), picture.getHeight(), grayPixels(picture), GRAY_BITS, null,
                    null);
        } catch (IOException | TesseractException | LinkageError e) {
            throw new OcrFailure("Tesseract could not read the image", e);
        }
    }

    /** The picture as 8-bit grayscale (transparent areas white), one byte per pixel, no row padding, direct for JNA. */
    static ByteBuffer grayPixels(BufferedImage picture) {
        var gray = new BufferedImage(picture.getWidth(), picture.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        var graphics = gray.createGraphics();
        graphics.setColor(Color.WHITE);
        graphics.fillRect(0, 0, gray.getWidth(), gray.getHeight());
        graphics.drawImage(picture, 0, 0, null);
        graphics.dispose();
        var bytes = ((DataBufferByte) gray.getRaster().getDataBuffer()).getData();
        return ByteBuffer.allocateDirect(bytes.length).put(bytes).flip();
    }
}
