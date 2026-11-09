package com.algolearn.users;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * An account. The email is stored lower-cased (unique {@code uk_users_email}); the Codeforces
 * handle stays null until linked and is unique ignoring case ({@code uk_users_cf_handle}).
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String email;
    private String passwordHash;
    private String name = "";
    private String cfHandle;
    private Integer cfRating;
    private Integer cfMaxRating;
    private Instant lastSyncedAt;
    private Long lastSubmissionId;
    private Instant syncLockedUntil;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
