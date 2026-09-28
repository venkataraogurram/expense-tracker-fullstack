package com.example.expensetracker.security;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * GET /api/me — who is the signed-in user?
 *
 * When the ALB authenticates via Federate/Midway it adds:
 *   x-amzn-oidc-identity  the "sub" claim (Amazon alias)
 *   x-amzn-oidc-data      a signed JWT with all claims
 * We only trust the alias after {@link AlbOidcVerifier} has validated the JWT.
 * Without the ALB in front (local dev) the endpoint returns authenticated=false.
 */
@RestController
@RequestMapping("/api")
public class MeController {

    private final AlbOidcVerifier verifier;

    public MeController(AlbOidcVerifier verifier) {
        this.verifier = verifier;
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpServletRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        Optional<JsonNode> claims = verifier.verify(request.getHeader("x-amzn-oidc-data"));

        if (claims.isEmpty()) {
            body.put("authenticated", false);
            return body;
        }

        JsonNode c = claims.get();
        String alias = firstNonBlank(c.path("sub").asText(null), request.getHeader("x-amzn-oidc-identity"));
        body.put("authenticated", true);
        body.put("alias", alias);
        body.put("name", firstNonBlank(c.path("name").asText(null), c.path("given_name").asText(null), alias));
        body.put("email", c.path("email").asText(null));
        body.put("expiresAt", c.path("exp").asLong(0));
        return body;
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return null;
    }
}
