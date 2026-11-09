package com.algolearn.security;

import com.algolearn.common.error.AuthException;
import com.algolearn.common.error.ErrorCode;
import java.util.regex.Pattern;

/** Reads the token from {@code Authorization: Bearer <token>} exactly like the legacy readBearerToken. */
public final class BearerToken {

    private static final Pattern BEARER =
            Pattern.compile("^Bearer ([A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+)$");

    private BearerToken() {
    }

    /** Missing or blank → AUTH_REQUIRED; anything but {@code Bearer <a.b.c>} → AUTH_INVALID_TOKEN. */
    public static String read(String header) {
        if (header == null || header.trim().isEmpty()) {
            throw new AuthException(ErrorCode.AUTH_REQUIRED, "Authentication required");
        }
        var match = BEARER.matcher(header.trim());
        if (!match.matches()) {
            throw new AuthException(ErrorCode.AUTH_INVALID_TOKEN, "Authorization header must be \"Bearer <token>\"");
        }
        return match.group(1);
    }
}
