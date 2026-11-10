package com.algolearn.stuck;

import com.algolearn.llm.CoachRequest;
import com.algolearn.llm.CoachResult;
import com.algolearn.llm.ImageText;
import com.algolearn.llm.Llm;
import java.time.Instant;
import java.util.Optional;

/** What the stuck flow needs from the LLM module (never throws). Integration tests replace it with a fake. */
public interface StuckAi {

    CoachResult coach(CoachRequest request);

    Optional<ImageText> readImage(byte[] image, String mimeType, Instant deadline);

    static StuckAi of(Llm llm) {
        return new StuckAi() {
            @Override
            public CoachResult coach(CoachRequest request) {
                return llm.getCoachAnswer(request);
            }

            @Override
            public Optional<ImageText> readImage(byte[] image, String mimeType, Instant deadline) {
                return llm.extractImageText(image, mimeType, deadline);
            }
        };
    }
}
