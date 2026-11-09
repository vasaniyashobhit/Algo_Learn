package com.algolearn.support;

import static com.algolearn.support.Accounts.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** HTTP helpers for handle linking and sync (legacy route tests' link / sync calls). */
public final class Handles {

    private Handles() {
    }

    public static ResultActions link(MockMvc mvc, String token, Object body) throws Exception {
        var request = put("/api/v1/users/me/handle").contentType(MediaType.APPLICATION_JSON)
                .content(Json.MAPPER.writeValueAsString(body));
        return mvc.perform(token == null ? request : bearer(request, token));
    }

    public static ResultActions unlink(MockMvc mvc, String token) throws Exception {
        var request = delete("/api/v1/users/me/handle");
        return mvc.perform(token == null ? request : bearer(request, token));
    }

    public static ResultActions sync(MockMvc mvc, String token) throws Exception {
        var request = post("/api/v1/users/me/sync");
        return mvc.perform(token == null ? request : bearer(request, token));
    }

    /** Signs up, links {@code handle} (200 expected) and returns the account. */
    public static Accounts.Account linkedAccount(MockMvc mvc, String handle) throws Exception {
        var account = Accounts.signup(mvc);
        var status = link(mvc, account.token(), java.util.Map.of("handle", handle)).andReturn().getResponse()
                .getStatus();
        assertThat(status).isEqualTo(200);
        return account;
    }

    /** Signs up, links and syncs (200 expected) and returns the token. */
    public static String syncedToken(MockMvc mvc, String handle) throws Exception {
        var account = linkedAccount(mvc, handle);
        assertThat(sync(mvc, account.token()).andReturn().getResponse().getStatus()).isEqualTo(200);
        return account.token();
    }
}
