package com.algolearn.meta;

import com.algolearn.config.Tags;
import org.springframework.stereotype.Service;

/** Static reference data for the frontend. */
@Service
public class MetaService {

    public TagLists tags() {
        return new TagLists(Tags.TOPIC_TAGS, Tags.ALL_TAGS);
    }
}
