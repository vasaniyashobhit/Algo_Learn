package com.algolearn.jobs;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** {@link LinkedUsers} from the users table (legacy {@code User.find({ cfHandle: { $type: 'string' } })}). */
@Repository
public class JdbcLinkedUsers implements LinkedUsers {

    private final JdbcTemplate jdbc;

    public JdbcLinkedUsers(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<UUID> ids() {
        return jdbc.queryForList("SELECT id FROM users WHERE cf_handle IS NOT NULL ORDER BY created_at, id",
                UUID.class);
    }
}
