package com.algolearn.stuck.url;

import com.algolearn.stuck.url.PageFetcher.FetchFailure;
import com.algolearn.stuck.url.PageFetcher.Kind;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.function.LongSupplier;

/**
 * Legacy readLimitedBody: a declared length over the limit fails before reading; the stream stops as soon as it
 * passes {@code maxBytes} (a huge page is never fully downloaded) or the deadline passes. Decoded as UTF-8.
 */
public final class LimitedBody {

    private static final int CHUNK = 8_192;

    private LimitedBody() {
    }

    public static String read(InputStream body, long declaredLength, int maxBytes, long deadline, LongSupplier now)
            throws IOException {
        if (declaredLength > maxBytes) {
            throw tooLarge(maxBytes);
        }
        if (body == null) {
            return "";
        }
        var out = new ByteArrayOutputStream();
        var buffer = new byte[CHUNK];
        for (int n = body.read(buffer); n >= 0; n = body.read(buffer)) {
            if (out.size() + n > maxBytes) {
                throw tooLarge(maxBytes);
            }
            out.write(buffer, 0, n);
            if (now.getAsLong() >= deadline) {
                throw new FetchFailure(Kind.TIMEOUT, "The page took too long to download", null);
            }
        }
        return out.toString(StandardCharsets.UTF_8);
    }

    static FetchFailure tooLarge(int maxBytes) {
        return new FetchFailure(Kind.TOO_LARGE, "The response is larger than " + maxBytes + " bytes", null);
    }
}
