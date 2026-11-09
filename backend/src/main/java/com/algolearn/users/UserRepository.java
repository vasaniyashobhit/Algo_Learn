package com.algolearn.users;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** CRUD access to users. */
public interface UserRepository extends JpaRepository<User, UUID> {

    /** Emails are stored lower-cased, so callers pass a normalized email. */
    Optional<User> findByEmail(String email);
}
