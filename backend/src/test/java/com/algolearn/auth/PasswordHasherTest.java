package com.algolearn.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordHasherTest {

    @Test
    void usesBcrypt2bWithCost12ByDefault() {
        var hasher = new PasswordHasher(PasswordHasher.DEFAULT_ROUNDS);
        var hash = hasher.hash("secret123");
        assertThat(PasswordHasher.DEFAULT_ROUNDS).isEqualTo(12);
        assertThat(hasher.rounds()).isEqualTo(12);
        assertThat(hash).startsWith("$2b$12$");
        assertThat(PasswordHasher.roundsOf(hash)).isEqualTo(12);
        assertThat(hasher.matches("secret123", hash)).isTrue();
        assertThat(hasher.matches("secret124", hash)).isFalse();
    }

    @Test
    void onlyTheFirst72BytesCountLikeNodeBcrypt() {
        var hasher = new PasswordHasher(4);
        var password = "a1" + "x".repeat(70);
        var hash = hasher.hash(password);
        assertThat(hasher.matches(password + "anything", hash)).isTrue();
        assertThat(hasher.matches(password.substring(1), hash)).isFalse();
    }

    @Test
    void alsoVerifiesThe2aVariant() {
        var hasher = new PasswordHasher(4);
        var hash = hasher.hash("secret123");
        assertThat(hasher.matches("secret123", hash.replace("$2b$", "$2a$"))).isTrue();
    }
}
