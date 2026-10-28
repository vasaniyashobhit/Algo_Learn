import mongoose from 'mongoose';
import { createSchema, requiredRef } from '../../db/schema.js';
import { TOPIC_KINDS } from '../../config/constants.js';
import { TOPIC_PAIR_KEYS, isTopicTag } from '../../config/tags.js';

const pairKeys = new Set(TOPIC_PAIR_KEYS);

/** A key is valid when it matches its kind: a topic tag for `single`, a pair key for `pair`. */
export const isValidTopicKey = (kind, key) =>
  kind === 'pair' ? pairKeys.has(key) : kind === 'single' && isTopicTag(key);

const counter = { type: Number, default: 0, min: 0 };
const nullableRating = { type: Number, default: null, min: 0 };

const topicStatSchema = createSchema(
  {
    userId: requiredRef('User'),
    topicKey: {
      type: String,
      required: true,
      validate: {
        validator(key) {
          return isValidTopicKey(this.kind, key);
        },
        message: (props) => `${props.value} is not a valid topic key for its kind`,
      },
    },
    kind: { type: String, required: true, enum: [...TOPIC_KINDS] },
    attempted: counter,
    solved: counter,
    failed: counter,
    avgSolvedRating: nullableRating,
    maxSolvedRating: nullableRating,
    comfortRating: nullableRating,
    strength: { type: Number, default: 0, min: 0, max: 1 },
    lastActivityAt: { type: Date, default: null },
  },
  { collection: 'topicstats' },
);

topicStatSchema.index({ userId: 1, topicKey: 1 }, { unique: true });

export const TopicStat = mongoose.model('TopicStat', topicStatSchema);
