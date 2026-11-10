package com.algolearn.stuck;

import static com.algolearn.stuck.ServiceHarness.USER_ID;
import static com.algolearn.stuck.StuckFixtures.PNG;
import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.UnprocessableException;
import com.algolearn.llm.FakeLimiter;
import com.algolearn.llm.FakeProvider;
import com.algolearn.llm.Llm;
import com.algolearn.llm.LlmFakes;
import com.algolearn.llm.chain.LlmException;
import com.algolearn.stuck.input.FromImage;
import com.algolearn.stuck.input.FromPdf;
import com.algolearn.stuck.input.InputResolver;
import com.algolearn.stuck.input.Ocr;
import com.algolearn.stuck.input.OcrEngine;
import com.algolearn.stuck.input.ResolvedInput;
import com.algolearn.stuck.input.StuckInput;
import com.algolearn.stuck.input.UploadedFile;
import com.algolearn.stuck.url.FromUrl;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy stuck.deadline.test.js: the real chain and limits on a fake clock; every provider hangs. */
class StuckDeadlineTest {

    private static final StuckInput IMAGE = new StuckInput("image", null, null, new UploadedFile("image/png", PNG));

    private final ServiceHarness h = new ServiceHarness(null);
    private final FakeProvider gemini = FakeProvider.of("gemini", "a", FakeProvider.HANG);
    private final FakeProvider groq = FakeProvider.textOnly("groq", "g", FakeProvider.HANG);
    private final Llm llm = new Llm(List.of(gemini, groq), new LlmFakes.FakeCache(),
            LlmFakes.settings(h.clock, new java.util.ArrayList<>(), 25_000));

    private StuckService service(OcrEngine ocr) {
        var fromImage = new FromImage(llm::extractImageText, new Ocr(ocr, new FakeLimiter(h.clock)), h.clock);
        var resolver = new InputResolver(mock(FromUrl.class), mock(FromPdf.class), fromImage);
        return h.service(resolver, llm::getCoachAnswer);
    }

    @Test
    void imageOcrAndCoachShare50SecondsAndAnswerTheFallbackBefore55() {
        var result = service(image -> {
            h.clock.advance(Duration.ofSeconds(14));
            return STATEMENT;
        }).solve(USER_ID, IMAGE);
        assertThat(h.clock.millis() - 1_000).isGreaterThanOrEqualTo(50_000).isLessThan(55_000);
        assertThat(h.coachCalls).singleElement().satisfies(r -> assertThat(r.deadline()).isNotNull());
        assertThat(result.inputType()).isEqualTo("image");
        assertThat(result.result().source()).isEqualTo("fallback");
        assertThat(result.result().fallbackReason()).isEqualTo("AI_TIMEOUT");
        assertThat(result.result().hints()).isNotEmpty();
    }

    @Test
    void timesTheOcrOutAt15SecondsAndAnswersInputUnreadableAfter35() {
        var error = catchThrowableOfType(UnprocessableException.class, () -> service(image -> {
            throw new FakeLimiter.Hang();
        }).solve(USER_ID, IMAGE));
        assertThat(error.code()).isEqualTo(ErrorCode.INPUT_UNREADABLE);
        assertThat(((LlmException) error.getCause()).isTimeout()).isTrue();
        assertThat(h.clock.millis() - 1_000).isEqualTo(35_000);
        assertThat(h.coachCalls).isEmpty();
    }

    @Test
    void skipsTheCoachWhenLessThan10SecondsAreLeft() {
        var slow = mock(InputResolver.class);
        when(slow.resolve(any(), any())).thenAnswer(call -> {
            h.clock.advance(Duration.ofSeconds(41));
            return new ResolvedInput(STATEMENT, null, STATEMENT, null);
        });
        var result = h.service(slow, llm::getCoachAnswer).solve(USER_ID, new StuckInput("text", "t", null, null));
        assertThat(h.coachCalls).isEmpty();
        assertThat(gemini.jsonCalls).isZero();
        assertThat(result.result().fallbackReason()).isEqualTo("AI_TIMEOUT");
        assertThat(h.clock.millis() - 1_000).isEqualTo(41_000);
    }

    @Test
    void givesTheCoachAllRemainingTimeWhenTheInputWasQuick() {
        var quick = mock(InputResolver.class);
        when(quick.resolve(any(), any())).thenReturn(new ResolvedInput(STATEMENT, null, STATEMENT, null));
        var result = h.service(quick, llm::getCoachAnswer).solve(USER_ID, new StuckInput("text", "t", null, null));
        assertThat(h.clock.millis() - 1_000).isEqualTo(50_000);
        assertThat(groq.jsonCalls).isEqualTo(1);
        assertThat(result.result().fallbackReason()).isEqualTo("AI_TIMEOUT");
    }
}
