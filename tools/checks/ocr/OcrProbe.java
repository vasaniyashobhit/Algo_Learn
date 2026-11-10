import com.algolearn.stuck.input.TesseractEngine;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

/**
 * Runs the backend's real OCR adapter (TesseractEngine → Tess4J → libtesseract) on one image and prints the text.
 * Launched INSIDE the backend image by tools/checks/ocr-docker.mjs through Spring Boot's PropertiesLauncher, so it
 * uses the image's Tesseract install, TESSDATA_PREFIX and the jar's own Tess4J/JNA.
 */
public final class OcrProbe {

    private OcrProbe() {
    }

    public static void main(String[] args) throws Exception {
        var engine = new TesseractEngine(Optional.ofNullable(System.getenv("TESSDATA_PREFIX")));
        System.out.println("tesseract data found: " + engine.isAvailable());
        var started = System.nanoTime();
        var text = engine.recognize(Files.readAllBytes(Path.of(args[0])));
        System.out.printf("ocr took %d ms%n----- extracted text -----%n%s%n", (System.nanoTime() - started) / 1_000_000,
                text.strip());
    }
}
