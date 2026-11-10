package com.algolearn.llm.chain;

import com.algolearn.llm.chain.CallOutcome.Failed;
import com.algolearn.llm.provider.LlmProvider;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Calls one provider model (legacy callProvider). Each try gets min(timeoutMs, time left). Only
 * {@link FailureKind#RETRY} failures are tried again after {@code backoffMs}; a timeout or 503 opens the
 * model's circuit. Never throws: every failure is logged at warn (the documented LLM-chain exception).
 */
public final class ProviderCall {

    private static final Logger LOG = LoggerFactory.getLogger(ProviderCall.class);

    private ProviderCall() {
    }

    public static String budgetKey(LlmProvider provider) {
        return provider.name() + ":" + provider.model();
    }

    public static <T> CallOutcome<T> call(LlmProvider provider, Function<LlmProvider, T> call, ChainSettings s,
            long deadline) {
        var key = budgetKey(provider);
        if (s.breaker().isOpen(key)) {
            LOG.warn("LLM model timed out or was overloaded recently, skipping it (provider={}, model={})",
                    provider.name(), provider.model());
            return CallOutcome.failed(Failed.OPEN);
        }
        for (var attempt = 1; attempt <= s.tries(); attempt++) {
            var left = deadline - s.clock().millis();
            if (left <= 0) {
                return CallOutcome.failed(Failed.TIMEOUT);
            }
            if (!s.budget().tryTake(key)) {
                LOG.warn("LLM per-minute budget used up, skipping to the next provider (provider={}, model={}, "
                        + "attempt={})", provider.name(), provider.model(), attempt);
                return CallOutcome.failed(Failed.BUSY);
            }
            var limit = Math.min(s.timeoutMs(), left);
            try {
                return CallOutcome.ok(s.limiter().call(limit, () -> call.apply(provider)));
            } catch (RuntimeException e) {
                var failed = afterFailure(provider, e, s, attempt, limit, deadline);
                if (failed != null) {
                    return CallOutcome.failed(failed);
                }
            }
        }
        return CallOutcome.failed(Failed.ERROR);
    }

    /** Null to try again (after the backoff), else how this provider failed. */
    private static Failed afterFailure(LlmProvider provider, RuntimeException error, ChainSettings s, int attempt,
            long limit, long deadline) {
        var cutByDeadline = s.clock().millis() >= deadline
                || limit < s.timeoutMs() && error instanceof LlmException e && e.isTimeout();
        if (cutByDeadline) {
            LOG.warn("LLM chain deadline reached (provider={}, model={}, attempt={}, err={})", provider.name(),
                    provider.model(), attempt, LlmException.describe(error));
            return Failed.TIMEOUT;
        }
        var kind = FailureKind.of(error);
        if (kind == FailureKind.SICK) {
            s.breaker().trip(budgetKey(provider));
        }
        var retry = kind == FailureKind.RETRY && attempt < s.tries();
        LOG.warn("LLM call failed (provider={}, model={}, attempt={}, retry={}, kind={}, err={})", provider.name(),
                provider.model(), attempt, retry, kind, LlmException.describe(error));
        if (!retry) {
            return Failed.ERROR;
        }
        try {
            s.sleeper().sleep(s.backoffMs());
            return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            LOG.warn("LLM backoff interrupted (provider={}, model={})", provider.name(), provider.model());
            return Failed.ERROR;
        }
    }
}
