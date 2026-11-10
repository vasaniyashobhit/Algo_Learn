package com.algolearn.stuck;

import com.algolearn.llm.CoachAnswer;
import com.algolearn.stuck.match.StuckProblem;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Legacy tests/helpers/stuck.js and stuckService.js: files, statements, answers and stored problems. */
public final class StuckFixtures {

    public static final byte[] PNG = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3};
    public static final byte[] JPEG = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 1, 2};
    public static final byte[] WEBP = concat("RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1));
    public static final String STATEMENT = String.join("\n", "A. Theatre Square",
            "Theatre Square in the capital city of Berland has a rectangular shape with the size n × m meters.",
            "Find the least number of a × a flagstones needed to pave the Square.");

    private StuckFixtures() {
    }

    /** A tiny valid one-page PDF whose only text is {@code line}. */
    public static byte[] makePdf(String line) {
        var stream = "BT /F1 12 Tf 10 100 Td (" + line + ") Tj ET";
        var objects = List.of("<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 144] /Contents 4 0 R /Resources << /Font << /F1 5 0"
                        + " R >> >> >>",
                "<< /Length " + stream.length() + " >>\nstream\n" + stream + "\nendstream",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        var out = new StringBuilder("%PDF-1.4\n");
        var offsets = new ArrayList<Integer>();
        for (var i = 0; i < objects.size(); i++) {
            offsets.add(out.length());
            out.append(i + 1).append(" 0 obj\n").append(objects.get(i)).append("\nendobj\n");
        }
        var xref = out.length();
        out.append("xref\n0 ").append(objects.size() + 1).append("\n0000000000 65535 f \n");
        offsets.forEach(at -> out.append("%010d 00000 n \n".formatted(at)));
        out.append("trailer\n<< /Size ").append(objects.size() + 1).append(" /Root 1 0 R >>\nstartxref\n")
                .append(xref).append("\n%%EOF\n");
        return out.toString().getBytes(StandardCharsets.ISO_8859_1);
    }

    public static byte[] makePdf() {
        return makePdf("Theatre Square in Berland");
    }

    public static String html(String body) {
        return "<html><head><script>var x = 1;</script></head><body>" + body + "</body></html>";
    }

    /** A sanitized coach answer as getCoachAnswer returns it. */
    public static CoachAnswer coachAnswer(List<String> tags, Integer rating, List<String> hints, String approach) {
        return new CoachAnswer(tags, rating, hints, approach, List.of("Read input", "Print the product"), "O(1)",
                "#include <cstdio>\nint main() {}", List.of("Use 64-bit integers"));
    }

    public static CoachAnswer coachAnswer() {
        return coachAnswer(List.of("math"), 1000, List.of("Each side needs ceil(n / a) stones"),
                "Multiply ceil(n/a) by ceil(m/a).");
    }

    /** Legacy dbProblem: 1/A Theatre Square, rating 1000, tags [math], an editorial of two paragraphs. */
    public static StuckProblem dbProblem(String id, String title, String description, Integer rating,
            List<String> tags) {
        return new StuckProblem(id, title, description, "n m a", "one number", "",
                "Ceil both sides.\n\nThen multiply.", rating, tags);
    }

    public static StuckProblem dbProblem() {
        return dbProblem("1/A", "Theatre Square", "Theatre Square in the capital city of Berland.", 1000,
                List.of("math"));
    }

    private static byte[] concat(byte[] bytes) {
        var out = new ByteArrayOutputStream();
        out.writeBytes(bytes);
        return out.toByteArray();
    }
}
