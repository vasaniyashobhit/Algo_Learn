package com.algolearn.stuck;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.PayloadException;
import com.algolearn.common.error.ValidationException;
import com.algolearn.common.validation.JsonBody;
import com.algolearn.stuck.input.UploadedFile;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.Part;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

/**
 * Legacy upload middleware (multer, memory storage) on the parsed multipart parts: one file in field {@code file},
 * an allowed mime type (else 415), at most 10 text fields of at most 100,000 bytes each (else 400), at most 5 MB
 * (413; the servlet container enforces it while parsing, this check covers parts it already accepted).
 */
public final class StuckUpload {

    static final int MAX_FIELDS = 10;
    static final int MAX_FIELD_BYTES = 100_000;

    private StuckUpload() {
    }

    /** The text fields (in order; repeated names keep every value) and the file, if any. */
    public static Form read(HttpServletRequest request) throws IOException, ServletException {
        var fields = new LinkedHashMap<String, List<String>>();
        var files = new ArrayList<Part>();
        for (var part : request.getParts()) {
            if (part.getSubmittedFileName() != null) {
                files.add(part);
                continue;
            }
            var value = new String(part.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            if (value.getBytes(StandardCharsets.UTF_8).length > MAX_FIELD_BYTES) {
                throw invalid(part.getName(), "Field value too long");
            }
            fields.computeIfAbsent(part.getName(), k -> new ArrayList<>()).add(value);
            if (fields.values().stream().mapToInt(List::size).sum() > MAX_FIELDS) {
                throw invalid("file", "Too many fields");
            }
        }
        if (files.size() > 1) {
            throw invalid("file", "Too many files");
        }
        return new Form(fields, files.isEmpty() ? null : file(files.getFirst()));
    }

    private static UploadedFile file(Part part) throws IOException {
        if (!"file".equals(part.getName())) {
            throw new PayloadException(ErrorCode.FILE_TYPE_UNSUPPORTED, "Unsupported file upload",
                    List.of(new FieldIssue(part.getName(), "Unexpected file field")));
        }
        if (part.getSize() > StuckConstants.UPLOAD_MAX_BYTES) {
            throw new PayloadException(ErrorCode.FILE_TOO_LARGE, "The uploaded file is too large");
        }
        var type = part.getContentType() == null ? "application/octet-stream" : part.getContentType();
        if (!StuckConstants.UPLOAD_MIME_TYPES.contains(type)) {
            throw new PayloadException(ErrorCode.FILE_TYPE_UNSUPPORTED, "Upload a PDF, PNG, JPEG, WebP or text file",
                    List.of(new FieldIssue("file", "Unsupported type " + type)));
        }
        return new UploadedFile(type, part.getInputStream().readAllBytes());
    }

    private static ValidationException invalid(String field, String message) {
        return new ValidationException(ErrorCode.VALIDATION_FAILED, "Invalid file upload",
                List.of(new FieldIssue(field, message)));
    }

    /** Multipart text fields and the one file (null when none). */
    public record Form(Map<String, List<String>> fields, UploadedFile file) {

        /** The fields as a JSON object: one value → string, a repeated field → array (like multer). */
        public JsonBody asJson() {
            ObjectNode node = JsonNodeFactory.instance.objectNode();
            fields.forEach((name, values) -> {
                if (values.size() == 1) {
                    node.put(name, values.getFirst());
                } else {
                    values.forEach(node.putArray(name)::add);
                }
            });
            return new JsonBody(node);
        }
    }
}
