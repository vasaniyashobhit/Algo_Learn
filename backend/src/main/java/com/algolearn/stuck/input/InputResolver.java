package com.algolearn.stuck.input;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.PayloadException;
import com.algolearn.common.error.ValidationException;
import com.algolearn.stuck.url.FromUrl;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Legacy resolveInput: {@code { inputType, text, url, file }} → the problem text and/or id plus the raw input,
 * through the matching reader. {@code text} also accepts a .txt upload. {@code deadline} bounds image reading.
 */
public class InputResolver {

    static final Map<String, List<String>> FILE_TYPES = Map.of(
            "text", List.of("text/plain"),
            "pdf", List.of("application/pdf"),
            "image", List.of("image/png", "image/jpeg", "image/webp"));

    private final FromUrl fromUrl;
    private final FromPdf fromPdf;
    private final FromImage fromImage;

    public InputResolver(FromUrl fromUrl, FromPdf fromPdf, FromImage fromImage) {
        this.fromUrl = fromUrl;
        this.fromPdf = fromPdf;
        this.fromImage = fromImage;
    }

    public ResolvedInput resolve(StuckInput input, Instant deadline) {
        return switch (input.inputType()) {
            case "url" -> {
                if (input.url() == null || input.url().isEmpty()) {
                    throw required("body.url", "Paste a link to the problem");
                }
                var read = fromUrl.read(input.url());
                yield new ResolvedInput(read.text(), read.problemId(), input.url(), null);
            }
            case "text" -> {
                if (input.file() == null && input.text() == null) {
                    throw required("body.text", "Paste the problem statement");
                }
                var raw = input.file() == null ? input.text()
                        : new String(checkFile(input.file(), "text").bytes(), StandardCharsets.UTF_8);
                var text = FromText.read(raw);
                yield new ResolvedInput(text, null, text, null);
            }
            case "pdf" -> {
                var text = fromPdf.read(checkFile(input.file(), "pdf").bytes());
                yield new ResolvedInput(text, null, text, null);
            }
            default -> {
                var image = checkFile(input.file(), "image");
                var read = fromImage.read(image.bytes(), image.mimeType(), deadline);
                yield new ResolvedInput(read.text(), null, read.text(), read.reader());
            }
        };
    }

    /** The file must exist, have a mime type allowed for {@code inputType} and match its signature. */
    public static UploadedFile checkFile(UploadedFile file, String inputType) {
        if (file == null) {
            throw required("file", "Upload a " + ("pdf".equals(inputType) ? "PDF" : inputType) + " file");
        }
        var allowed = FILE_TYPES.get(inputType);
        if (!allowed.contains(file.mimeType()) || !FileSignature.matches(file.bytes(), file.mimeType())) {
            throw new PayloadException(ErrorCode.FILE_TYPE_UNSUPPORTED,
                    "This file does not look like a " + String.join(" or ", allowed) + " file",
                    List.of(new FieldIssue("file", "Allowed for " + inputType + ": " + String.join(", ", allowed))));
        }
        return file;
    }

    private static ValidationException required(String field, String message) {
        return new ValidationException(ErrorCode.VALIDATION_FAILED, "Request validation failed",
                List.of(new FieldIssue(field, message)));
    }
}
