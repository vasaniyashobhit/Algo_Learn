package com.algolearn.config.env;

import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;

/** Prints the env problems as a short startup report instead of a long stack trace. */
public class EnvFailureAnalyzer extends AbstractFailureAnalyzer<EnvValidationException> {

    @Override
    protected FailureAnalysis analyze(Throwable rootFailure, EnvValidationException cause) {
        return new FailureAnalysis(cause.getMessage(),
                "Copy backend/.env.example to backend/.env (or set the variables) and fix the values above.",
                cause);
    }
}
