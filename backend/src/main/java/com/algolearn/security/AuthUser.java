package com.algolearn.security;

import java.util.UUID;

/** The caller of a protected route, read from a verified JWT (legacy {@code req.user = { id, email }}). */
public record AuthUser(UUID id, String email) {
}
