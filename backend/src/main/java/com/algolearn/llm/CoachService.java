package com.algolearn.llm;

import com.algolearn.llm.cache.CacheKey;
import com.algolearn.llm.cache.CoachCache;
import com.algolearn.llm.chain.CallOutcome.Failed;
import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.llm.chain.LlmException;
import com.algolearn.llm.chain.ProviderCall;
import com.algolearn.llm.prompt.CoachPrompt;
import com.algolearn.llm.provider.LlmProvider;
import com.algolearn.llm.schema.CoachResponseParser;
import com.algolearn.common.validation.JsText;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * {@link #getCoachAnswer} never throws (legacy coach.service). Order: cache → each provider in order → the
 * fallback with a reason. The deadline bounds the whole chain: once it passes no other provider is tried
 * (AI_TIMEOUT). Only successful, schema-valid answers are cached.
 */
public class CoachService {

    private static final Logger LOG = LoggerFactory.getLogger(CoachService.class);

    private final List<LlmProvider> providers;
    private final CoachCache cache;
    private final ChainSettings settings;

    public CoachService(List<LlmProvider> providers, CoachCache cache, ChainSettings settings) {
        this.providers = List.copyOf(providers);
        this.cache = cache;
        this.settings = settings;
    }

    public CoachResult getCoachAnswer(CoachRequest request) {
        try {
            return answer(request == null ? new CoachRequest(null, null, null, null) : request);
        } catch (RuntimeException e) {
            LOG.error("Unexpected coach failure, using the fallback (err={})", LlmException.describe(e), e);
            return CoachResult.fallback(FallbackReason.AI_UNAVAILABLE);
        }
    }

    private CoachResult answer(CoachRequest request) {
        var key = CacheKey.of(request.problemId(), request.text());
        if (key.isEmpty()) {
            return CoachResult.fallback(FallbackReason.NO_INPUT);
        }
        var hit = cache.get(key.get());
        if (hit.isPresent()) {
            return CoachResult.of(CoachResult.CACHE, hit.get());
        }
        if (request.text() == null || JsText.isBlank(request.text())) {
            return CoachResult.fallback(FallbackReason.NO_INPUT);
        }
        var deadline = request.deadline() == null ? settings.clock().millis() + settings.deadlineMs()
                : request.deadline().toEpochMilli();
        var prompt = CoachPrompt.build(request.text(), request.knownTags());
        var failures = new ArrayList<Failed>();
        for (var provider : providers) {
            var outcome = ProviderCall.call(provider, p -> CoachResponseParser.parse(p.generateJson(prompt)),
                    settings, deadline);
            if (outcome.value() != null) {
                var written = new CachedAnswer(outcome.value(), provider.name(), provider.model());
                cache.set(key.get(), written);
                return CoachResult.of(CoachResult.AI, written);
            }
            failures.add(outcome.failed());
            if (outcome.failed() == Failed.TIMEOUT) {
                break;
            }
        }
        var reason = reasonOf(failures);
        LOG.warn("Every LLM provider failed, using the fallback (key={}, reason={})", key.get(), reason);
        return CoachResult.fallback(reason);
    }

    static FallbackReason reasonOf(List<Failed> failures) {
        if (failures.contains(Failed.TIMEOUT)) {
            return FallbackReason.AI_TIMEOUT;
        }
        var allBusy = !failures.isEmpty() && failures.stream().allMatch(f -> f == Failed.BUSY);
        return allBusy ? FallbackReason.AI_BUSY : FallbackReason.AI_UNAVAILABLE;
    }
}
