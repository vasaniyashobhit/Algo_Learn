package com.algolearn.common.validation;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.FieldIssue;
import com.algolearn.common.error.ValidationException;
import java.util.ArrayList;
import java.util.List;

/**
 * Collects validation problems in order (like zod across params, query and body) and throws them
 * together as one 400 VALIDATION_FAILED.
 */
public final class Issues {

    private final List<FieldIssue> list = new ArrayList<>();

    public Issues add(String field, String message) {
        list.add(new FieldIssue(field, message));
        return this;
    }

    public boolean isEmpty() {
        return list.isEmpty();
    }

    public int size() {
        return list.size();
    }

    public List<FieldIssue> list() {
        return List.copyOf(list);
    }

    public void throwIfAny() {
        if (!list.isEmpty()) {
            throw new ValidationException(ErrorCode.VALIDATION_FAILED, "Request validation failed", list(), null);
        }
    }
}
