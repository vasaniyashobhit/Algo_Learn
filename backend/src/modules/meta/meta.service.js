import { ALL_TAGS, TOPIC_TAGS } from '../../config/tags.js';

export const getTags = async () => ({ topicTags: TOPIC_TAGS, allTags: ALL_TAGS });
