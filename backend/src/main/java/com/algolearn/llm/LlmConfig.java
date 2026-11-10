package com.algolearn.llm;

import com.algolearn.config.AppProperties;
import com.algolearn.llm.cache.CoachCache;
import com.algolearn.llm.cache.JdbcCoachCache;
import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.llm.chain.ExecutorTimeLimiter;
import com.algolearn.llm.provider.GeminiProvider;
import com.algolearn.llm.provider.GroqProvider;
import com.algolearn.llm.provider.LlmHttp;
import com.algolearn.llm.provider.LlmProvider;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/** Wires the LLM module from the environment: one provider per GEMINI_MODELS entry, Groq only with a key. */
@Configuration(proxyBeanMethods = false)
public class LlmConfig {

    @Bean(destroyMethod = "close")
    ExecutorTimeLimiter llmTimeLimiter() {
        return ExecutorTimeLimiter.virtualThreads();
    }

    @Bean
    ChainSettings llmChainSettings(Clock clock, ExecutorTimeLimiter llmTimeLimiter) {
        return ChainSettings.defaults(clock, llmTimeLimiter);
    }

    @Bean
    CoachCache coachCache(JdbcTemplate jdbc, Clock clock, JsonMapper mapper) {
        return new JdbcCoachCache(jdbc, clock, mapper);
    }

    @Bean
    Llm llm(AppProperties props, RestClient.Builder builder, JsonMapper mapper, CoachCache coachCache,
            ChainSettings llmChainSettings,
            @Value("${algolearn.llm.gemini-base-url:" + GeminiProvider.BASE_URL + "}") String geminiUrl,
            @Value("${algolearn.llm.groq-base-url:" + GroqProvider.BASE_URL + "}") String groqUrl) {
        return new Llm(providers(props, builder, mapper, geminiUrl, groqUrl), coachCache, llmChainSettings);
    }

    /** In GEMINI_MODELS order, then Groq when configured ({@link Llm} applies the chain order). */
    static List<LlmProvider> providers(AppProperties props, RestClient.Builder builder, JsonMapper mapper,
            String geminiUrl, String groqUrl) {
        var gemini = new LlmHttp(LlmHttp.client(builder, geminiUrl), mapper, "Gemini");
        var list = new ArrayList<LlmProvider>();
        props.geminiModels().forEach(model -> list.add(new GeminiProvider(gemini, props.geminiApiKey(), model)));
        var groq = new LlmHttp(LlmHttp.client(builder, groqUrl), mapper, "Groq");
        GroqProvider.create(groq, props.groqApiKey(), props.groqModel()).ifPresent(list::add);
        return list;
    }
}
