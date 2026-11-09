package com.algolearn.meta;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.algolearn.config.Tags;
import com.algolearn.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

class MetaIT extends IntegrationTest {

    private final JsonMapper json;

    MetaIT(MockMvc mvc, JsonMapper json) {
        super(mvc);
        this.json = json;
    }

    @Test
    void returnsTopicTagsAndAllTagsInCanonicalOrder() throws Exception {
        var body = mvc.perform(get("/api/v1/meta/tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.topicTags.length()").value(36))
                .andExpect(jsonPath("$.data.allTags.length()").value(37))
                .andReturn().getResponse().getContentAsString();
        var expected = json.writeValueAsString(java.util.Map.of("success", true,
                "data", java.util.Map.of("topicTags", Tags.TOPIC_TAGS, "allTags", Tags.ALL_TAGS)));
        assertThat(json.readTree(body)).isEqualTo(json.readTree(expected));
    }

    @Test
    void serviceReturnsTheSharedTagLists() {
        assertThat(new MetaService().tags()).isEqualTo(new TagLists(Tags.TOPIC_TAGS, Tags.ALL_TAGS));
    }
}
