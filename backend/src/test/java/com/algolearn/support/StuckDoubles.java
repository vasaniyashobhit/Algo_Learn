package com.algolearn.support;

import com.algolearn.llm.CoachRequest;
import com.algolearn.llm.CoachResult;
import com.algolearn.llm.FallbackReason;
import com.algolearn.llm.ImageText;
import com.algolearn.stuck.StuckAi;
import com.algolearn.stuck.input.OcrEngine;
import com.algolearn.stuck.url.UrlFakes;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Legacy stuckApp: the stuck flow in integration tests uses a fake LLM, OCR, fetch and DNS (no network). */
@TestConfiguration(proxyBeanMethods = false)
public class StuckDoubles {

    @Bean
    @Primary
    FakeAi fakeStuckAi() {
        return new FakeAi();
    }

    @Bean
    @Primary
    FakeOcr fakeOcrEngine() {
        return new FakeOcr();
    }

    @Bean
    @Primary
    UrlFakes.Hosts fakeHosts() {
        return new UrlFakes.Hosts();
    }

    @Bean
    @Primary
    UrlFakes.Pages fakePages() {
        return new UrlFakes.Pages();
    }

    /** Fake LLM (legacy fakeLlm): the coach answers {@link #coach}, image reading {@link #image}. */
    public static final class FakeAi implements StuckAi {
        public CoachResult coach;
        public ImageText image;
        public final List<CoachRequest> coachCalls = new ArrayList<>();
        public int imageCalls;

        public FakeAi() {
            reset();
        }

        public void reset() {
            coach = CoachResult.fallback(FallbackReason.AI_UNAVAILABLE);
            image = null;
            coachCalls.clear();
            imageCalls = 0;
        }

        @Override
        public CoachResult coach(CoachRequest request) {
            coachCalls.add(request);
            return coach;
        }

        @Override
        public Optional<ImageText> readImage(byte[] bytes, String mimeType, Instant deadline) {
            imageCalls++;
            return Optional.ofNullable(image);
        }
    }

    /** Fake OCR (legacy fakeOcr): recognises {@link #text}. */
    public static final class FakeOcr implements OcrEngine {
        public String text = "";
        public int calls;

        @Override
        public String recognize(byte[] image) {
            calls++;
            return text;
        }
    }
}
