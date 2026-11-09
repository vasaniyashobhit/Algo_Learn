package com.algolearn.support;

import com.algolearn.users.User;
import java.util.concurrent.atomic.AtomicInteger;

/** User factory for database tests (legacy makeUser). */
public final class Users {

    private static final AtomicInteger SEQ = new AtomicInteger();

    private Users() {
    }

    public static User user(String cfHandle) {
        var user = new User();
        user.setEmail("user" + SEQ.incrementAndGet() + "@example.com");
        user.setPasswordHash("$2b$10$hash");
        user.setName("Test User");
        user.setCfHandle(cfHandle);
        return user;
    }

    public static User user() {
        return user(null);
    }
}
