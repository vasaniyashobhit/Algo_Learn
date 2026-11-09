package com.algolearn.sync;

/** A submission Codeforces is still judging (not stored yet; a later sync stores it). */
public record PendingRef(String problemId, long cfSubmissionId) {
}
