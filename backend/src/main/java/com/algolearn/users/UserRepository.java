package com.algolearn.users;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** CRUD access to users. */
public interface UserRepository extends JpaRepository<User, UUID> {
}
