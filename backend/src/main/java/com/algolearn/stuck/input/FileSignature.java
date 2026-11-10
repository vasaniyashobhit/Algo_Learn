package com.algolearn.stuck.input;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/** Legacy matchesSignature: the first bytes must match the declared mime type (the header can be spoofed). */
public final class FileSignature {

    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};

    private FileSignature() {
    }

    public static boolean matches(byte[] bytes, String mimeType) {
        if (bytes == null || bytes.length == 0 || mimeType == null) {
            return false;
        }
        return switch (mimeType) {
            case "application/pdf" -> startsWith(bytes, 0, "%PDF-");
            case "image/png" -> bytes.length >= PNG.length && Arrays.equals(bytes, 0, PNG.length, PNG, 0, PNG.length);
            case "image/jpeg" -> bytes.length >= 3 && bytes[0] == (byte) 0xff && bytes[1] == (byte) 0xd8
                    && bytes[2] == (byte) 0xff;
            case "image/webp" -> startsWith(bytes, 0, "RIFF") && startsWith(bytes, 8, "WEBP");
            // Text has no magic number: refuse NUL bytes (a binary file renamed .txt).
            case "text/plain" -> noNul(bytes);
            default -> false;
        };
    }

    private static boolean startsWith(byte[] bytes, int offset, String ascii) {
        var expected = ascii.getBytes(StandardCharsets.ISO_8859_1);
        return bytes.length >= offset + expected.length
                && Arrays.equals(bytes, offset, offset + expected.length, expected, 0, expected.length);
    }

    private static boolean noNul(byte[] bytes) {
        for (var b : bytes) {
            if (b == 0) {
                return false;
            }
        }
        return true;
    }
}
