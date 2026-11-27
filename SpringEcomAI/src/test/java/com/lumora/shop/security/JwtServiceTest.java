package com.lumora.shop.security;

import com.lumora.shop.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = Base64.getEncoder().encodeToString(new byte[32]); // 256-bit test key

    @Test
    void roundTripKeepsSubjectAndRole() {
        JwtService jwt = new JwtService(SECRET, 60_000);
        Claims claims = jwt.parse(jwt.generateToken("u@shop.test", Role.ADMIN));
        assertThat(claims.getSubject()).isEqualTo("u@shop.test");
        assertThat(claims.get("role", String.class)).isEqualTo("ADMIN");
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService jwt = new JwtService(SECRET, -1_000);          // already expired when issued
        String token = jwt.generateToken("u@shop.test", Role.USER);
        assertThatThrownBy(() -> jwt.parse(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void tokenFromDifferentKeyIsRejected() {
        String other = Base64.getEncoder().encodeToString("another-secret-another-secret-123".getBytes());
        String token = new JwtService(other, 60_000).generateToken("u@shop.test", Role.USER);
        assertThatThrownBy(() -> new JwtService(SECRET, 60_000).parse(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void tamperedPayloadIsRejected() {
        JwtService jwt = new JwtService(SECRET, 60_000);
        String[] p = jwt.generateToken("u@shop.test", Role.USER).split("\\.");
        String forgedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":\"u@shop.test\",\"role\":\"ADMIN\"}".getBytes());
        assertThatThrownBy(() -> jwt.parse(p[0] + "." + forgedPayload + "." + p[2]))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void weakSecretFailsFast() {
        String weak = Base64.getEncoder().encodeToString("short".getBytes());
        assertThatThrownBy(() -> new JwtService(weak, 60_000)).isInstanceOf(RuntimeException.class);
    }

    @Test
    void plainTextSecretIsAcceptedInsteadOfCrashingStartup() {
        JwtService jwt = new JwtService("this-is-a-plain-text-secret-with-dashes-1234", 60_000);
        assertThat(jwt.parse(jwt.generateToken("u@shop.test", Role.USER)).getSubject()).isEqualTo("u@shop.test");
    }

    @Test
    void blankSecretFallsBackToEphemeralKeyThatStillWorks() {
        JwtService jwt = new JwtService("", 60_000);
        assertThat(jwt.parse(jwt.generateToken("u@shop.test", Role.USER)).getSubject()).isEqualTo("u@shop.test");
    }
}
