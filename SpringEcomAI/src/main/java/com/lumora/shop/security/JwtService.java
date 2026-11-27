package com.lumora.shop.security;

import com.lumora.shop.model.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Creates and verifies signed JWTs (HS256).
 * A token = base64url(header).base64url(payload).signature. The signature is an HMAC of the first
 * two parts with a server-only secret, so any change to the payload (e.g. role USER -> ADMIN)
 * invalidates it. The payload is signed, NOT encrypted: never put secrets in it.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    static final String ROLE_CLAIM = "role";

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret:}") String secret,
                      @Value("${app.jwt.expiration-ms:3600000}") long expirationMs) {
        this.expirationMs = expirationMs;
        if (secret == null || secret.isBlank()) {
            log.warn("JWT_SECRET is not set: using an EPHEMERAL signing key. "
                    + "All tokens become invalid on restart. Set JWT_SECRET (openssl rand -base64 32) for real use.");
            this.key = Jwts.SIG.HS256.key().build();
        } else {
            // Throws WeakKeyException if shorter than 256 bits: fail fast on a weak secret.
            this.key = Keys.hmacShaKeyFor(decodeSecret(secret.trim()));
        }
    }

    /** Normally base64 (openssl rand -base64 32). A plain text secret is accepted too instead of crashing the startup. */
    private static byte[] decodeSecret(String secret) {
        try {
            return Decoders.BASE64.decode(secret);
        } catch (RuntimeException notBase64) {
            return secret.getBytes(StandardCharsets.UTF_8);
        }
    }

    public String generateToken(String email, Role role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(email)
                .claim(ROLE_CLAIM, role.name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    /** Verifies signature and expiry. Throws io.jsonwebtoken.JwtException (or IllegalArgumentException) if invalid. */
    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
