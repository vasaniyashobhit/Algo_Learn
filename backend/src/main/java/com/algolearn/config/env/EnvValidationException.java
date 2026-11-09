package com.algolearn.config.env;

import java.util.List;
import java.util.stream.Collectors;

/** Thrown at startup when the environment is incomplete or invalid. Never contains values. */
public class EnvValidationException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final List<String> issues;

    public EnvValidationException(List<String> issues) {
        super(issues.stream().map(issue -> "  - " + issue).collect(Collectors.joining("\n",
                "Invalid environment configuration (see backend/.env.example):\n", "")));
        this.issues = List.copyOf(issues);
    }

    public List<String> issues() {
        return issues;
    }
}
