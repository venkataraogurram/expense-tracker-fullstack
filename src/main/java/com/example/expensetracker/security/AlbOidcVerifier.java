package com.example.expensetracker.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Verifies the {@code x-amzn-oidc-data} JWT that an Application Load Balancer adds
 * after authenticating the user with an OIDC provider (Amazon Federate / Midway).
 *
 * <p>Why bother when the ALB already authenticated the user? Because a client that
 * could reach the instance directly could forge the header. Validating the signature
 * (ES256, key published by the ALB service per region) and the {@code signer} claim
 * (our ALB's ARN) closes that gap. See the AWS blog post
 * "Security best practices when using ALB authentication".
 */
@Component
public class AlbOidcVerifier {

    private static final Logger log = LoggerFactory.getLogger(AlbOidcVerifier.class);
    private static final Pattern KID = Pattern.compile("^[A-Za-z0-9-]{1,128}$");

    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private final Map<String, PublicKey> keyCache = new ConcurrentHashMap<>();
    private final String region;
    private final String expectedSigner;

    public AlbOidcVerifier(ObjectMapper mapper,
                           @Value("${AWS_REGION:${aws.region:us-east-1}}") String region,
                           @Value("${ALB_ARN:}") String expectedSigner) {
        this.mapper = mapper;
        this.region = region;
        this.expectedSigner = expectedSigner == null ? "" : expectedSigner.trim();
    }

    /** Returns the verified claims, or empty if the token is missing or invalid. */
    public Optional<JsonNode> verify(String jwt) {
        if (jwt == null || jwt.isBlank()) {
            return Optional.empty();
        }
        try {
            String[] parts = jwt.split("\\.");
            if (parts.length != 3) {
                return Optional.empty();
            }
            JsonNode header = mapper.readTree(b64(parts[0]));
            JsonNode payload = mapper.readTree(b64(parts[1]));

            if (!"ES256".equals(header.path("alg").asText())) {
                log.warn("Rejecting ALB token with alg={}", header.path("alg").asText());
                return Optional.empty();
            }
            String signer = header.path("signer").asText("");
            if (!expectedSigner.isEmpty() && !expectedSigner.equals(signer)) {
                log.warn("Rejecting ALB token signed by unexpected ALB {}", signer);
                return Optional.empty();
            }
            long exp = payload.path("exp").asLong(0);
            if (exp != 0 && Instant.now().getEpochSecond() >= exp) {
                return Optional.empty();
            }

            String kid = header.path("kid").asText("");
            if (!KID.matcher(kid).matches()) {
                return Optional.empty();
            }
            PublicKey key = keyCache.computeIfAbsent(kid, this::fetchKey);

            Signature sig = Signature.getInstance("SHA256withECDSA");
            sig.initVerify(key);
            sig.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
            byte[] raw = Base64.getUrlDecoder().decode(parts[2]);
            if (!sig.verify(joseToDer(raw))) {
                log.warn("ALB token signature did not verify (kid={})", kid);
                return Optional.empty();
            }
            return Optional.of(payload);
        } catch (RuntimeException | IOException | GeneralSecurityException e) {
            log.warn("ALB token rejected: {}", e.toString());
            return Optional.empty();
        }
    }

    private byte[] b64(String s) {
        return Base64.getUrlDecoder().decode(s);
    }

    private PublicKey fetchKey(String kid) {
        try {
            URI uri = URI.create("https://public-keys.auth.elb." + region + ".amazonaws.com/" + kid);
            HttpResponse<String> res = http.send(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(3)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() != 200) {
                throw new IllegalStateException("public key fetch returned " + res.statusCode());
            }
            String pem = res.body().replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "").replaceAll("\\s", "");
            return KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(pem)));
        } catch (IOException | GeneralSecurityException e) {
            throw new IllegalStateException("cannot load ALB public key " + kid, e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("interrupted loading ALB public key", e);
        }
    }

    /** JWS ES256 signatures are raw R||S (64 bytes); Java's Signature wants DER SEQUENCE{INTEGER r, INTEGER s}. */
    static byte[] joseToDer(byte[] jose) {
        if (jose.length != 64) {
            throw new IllegalArgumentException("unexpected ES256 signature length " + jose.length);
        }
        byte[] r = trimAndPad(jose, 0);
        byte[] s = trimAndPad(jose, 32);
        int len = 2 + r.length + 2 + s.length;
        byte[] der = new byte[2 + len];
        int i = 0;
        der[i++] = 0x30;
        der[i++] = (byte) len;
        der[i++] = 0x02;
        der[i++] = (byte) r.length;
        System.arraycopy(r, 0, der, i, r.length);
        i += r.length;
        der[i++] = 0x02;
        der[i++] = (byte) s.length;
        System.arraycopy(s, 0, der, i, s.length);
        return der;
    }

    private static byte[] trimAndPad(byte[] src, int offset) {
        int start = offset;
        int end = offset + 32;
        while (start < end - 1 && src[start] == 0) {
            start++;
        }
        boolean needsPad = (src[start] & 0x80) != 0; // DER INTEGER must be positive
        byte[] out = new byte[(end - start) + (needsPad ? 1 : 0)];
        System.arraycopy(src, start, out, needsPad ? 1 : 0, end - start);
        return out;
    }
}
