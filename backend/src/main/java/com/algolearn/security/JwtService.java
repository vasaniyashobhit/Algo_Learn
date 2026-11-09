package com.algolearn.security;

import com.algolearn.common.error.AuthException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.config.AppProperties;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;
import java.util.regex.Pattern;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** HS256 tokens: {@code sub} = user id plus an {@code email} claim, valid for JWT_EXPIRES_IN. */
@Component
public class JwtService {

    public static final String ALGORITHM = "HS256";
    private static final Pattern USER_ID =
            Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");

    private final SecretKey key;
    private final Duration lifetime;
    private final JsonMapper json;
    private final Clock clock;

    /** Fails fast (at startup) when JWT_EXPIRES_IN is not a timespan. */
    public JwtService(AppProperties properties, JsonMapper json, Clock clock) {
        this.key = new SecretKeySpec(properties.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        this.lifetime = JwtLifetime.parse(properties.jwtExpiresIn());
        this.json = json;
        this.clock = clock;
    }

    public String sign(AuthUser user) {
        var issuedAt = clock.instant().truncatedTo(ChronoUnit.SECONDS);
        return Jwts.builder().json(JwtJson.serializer(json))
                .subject(user.id().toString()).claim("email", user.email())
                .issuedAt(Date.from(issuedAt)).expiration(Date.from(issuedAt.plus(lifetime)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    /** Throws AUTH_TOKEN_EXPIRED, or AUTH_INVALID_TOKEN for anything else that is wrong. */
    public AuthUser verify(String token) {
        try {
            var jws = Jwts.parser().json(JwtJson.deserializer(json)).verifyWith(key)
                    .clock(() -> Date.from(clock.instant())).build().parseSignedClaims(token);
            if (!ALGORITHM.equals(jws.getHeader().getAlgorithm())) {
                throw invalid(null);
            }
            var subject = jws.getPayload().getSubject();
            var email = jws.getPayload().get("email");
            if (subject == null || !USER_ID.matcher(subject).matches()
                    || !(email instanceof String text) || text.isEmpty()) {
                throw invalid(null);
            }
            return new AuthUser(UUID.fromString(subject), text);
        } catch (ExpiredJwtException e) {
            throw new AuthException(ErrorCode.AUTH_TOKEN_EXPIRED, "Your session has expired", null, e);
        } catch (AuthException e) {
            throw e;
        } catch (RuntimeException e) {
            throw invalid(e);
        }
    }

    private static AuthException invalid(Throwable cause) {
        return new AuthException(ErrorCode.AUTH_INVALID_TOKEN, "Invalid authentication token", null, cause);
    }
}
