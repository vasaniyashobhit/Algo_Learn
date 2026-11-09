package com.algolearn.auth;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Component;

/**
 * bcrypt ($2b$, cost 12 by default; tests use a lower cost via {@code algolearn.auth.hash-rounds}).
 * Like node bcrypt, only the first 72 bytes of a password count.
 */
@Component
public class PasswordHasher {

    public static final int DEFAULT_ROUNDS = 12;
    private static final int MAX_BYTES = 72;

    private final int rounds;

    public PasswordHasher(@Value("${algolearn.auth.hash-rounds:" + DEFAULT_ROUNDS + "}") int rounds) {
        this.rounds = rounds;
    }

    public int rounds() {
        return rounds;
    }

    public String hash(String password) {
        return BCrypt.hashpw(bytes(password), BCrypt.gensalt("$2b", rounds));
    }

    public boolean matches(String password, String hash) {
        return BCrypt.checkpw(bytes(password), hash);
    }

    /** The cost factor stored in a hash such as {@code $2b$12$...}. */
    public static int roundsOf(String hash) {
        return Integer.parseInt(hash.substring(4, 6));
    }

    private static byte[] bytes(String password) {
        var bytes = password.getBytes(StandardCharsets.UTF_8);
        return bytes.length > MAX_BYTES ? Arrays.copyOf(bytes, MAX_BYTES) : bytes;
    }
}
