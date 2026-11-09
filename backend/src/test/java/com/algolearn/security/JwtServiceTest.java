package com.algolearn.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.algolearn.common.error.AuthException;
import com.algolearn.support.Json;
import com.algolearn.support.TestProperties;
import io.jsonwebtoken.Jwts;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.UUID;
import java.util.function.Supplier;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** Legacy token.test.js and auth.module.test.js. */
class JwtServiceTest {

    private static final String SECRET = "s".repeat(32);
    private static final AuthUser USER =
            new AuthUser(UUID.fromString("65f1c2b8-e4a1-4b2c-83d4-e5f601a2b3c4"), "a@b.co");
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-09T10:00:00.500Z"), ZoneOffset.UTC);
    private final JwtService service = JwtServiceFactory.create(SECRET, Duration.ofHours(1), clock);

    private static io.jsonwebtoken.JwtBuilder builder() {
        return Jwts.builder().json(JwtJson.serializer(JsonMapper.builder().build()));
    }

    private static String codeOf(Supplier<AuthUser> verify) {
        return catchThrowableOfType(AuthException.class, verify::get).code().name();
    }

    private static String payload(String token) {
        return new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]), StandardCharsets.UTF_8);
    }

    @Test
    void roundTripsTheUserIdAsSubAndTheEmail() {
        var token = service.sign(USER);
        var header = new String(Base64.getUrlDecoder().decode(token.split("\\.")[0]), StandardCharsets.UTF_8);
        assertThat(Json.parse(header).get("alg").asString()).isEqualTo("HS256");
        var claims = Json.parse(payload(token));
        assertThat(claims.get("sub").asString()).isEqualTo(USER.id().toString());
        assertThat(claims.get("email").asString()).isEqualTo("a@b.co");
        assertThat(claims.get("exp").asLong() - claims.get("iat").asLong()).isEqualTo(3600);
        assertThat(claims.get("iat").asLong()).isEqualTo(Instant.parse("2026-11-09T10:00:00Z").getEpochSecond());
        assertThat(service.verify(token)).isEqualTo(USER);
    }

    @Test
    void rejectsAnExpiredTokenWithAuthTokenExpired() {
        var token = JwtServiceFactory.create(SECRET, Duration.ofSeconds(1), clock).sign(USER);
        var later = JwtServiceFactory.create(SECRET, Duration.ofSeconds(1), Clock.offset(clock, Duration.ofSeconds(2)));
        assertThat(codeOf(() -> later.verify(token))).isEqualTo("AUTH_TOKEN_EXPIRED");
    }

    @Test
    void rejectsEverythingElseWithAuthInvalidToken() {
        var key = new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        var other = JwtServiceFactory.create("o".repeat(32), Duration.ofHours(1), clock).sign(USER);
        var notUuid = builder().subject("admin").claim("email", "a@b.co").signWith(key).compact();
        var noEmail = builder().subject(USER.id().toString()).signWith(key).compact();
        var unsigned = builder().subject(USER.id().toString()).claim("email", "a@b.co").compact();
        var hs512Key = new SecretKeySpec(("k".repeat(64)).getBytes(StandardCharsets.UTF_8), "HmacSHA512");
        var hs512 = builder().subject(USER.id().toString()).signWith(hs512Key).compact();
        for (var token : new String[] {other, "not.a.jwt", notUuid, noEmail, unsigned, hs512, "x.y.z", ""}) {
            assertThat(codeOf(() -> service.verify(token))).as(token).isEqualTo("AUTH_INVALID_TOKEN");
        }
    }

    @Test
    void readsSecretAndLifetimeFromTheSettings() {
        var fromSettings = new JwtService(TestProperties.app(false), JsonMapper.builder().build(), clock);
        var claims = Json.parse(payload(fromSettings.sign(USER)));
        assertThat(claims.get("exp").asLong() - claims.get("iat").asLong()).isEqualTo(7 * 24 * 3600);
        assertThat(fromSettings.verify(fromSettings.sign(USER))).isEqualTo(USER);
    }
}
