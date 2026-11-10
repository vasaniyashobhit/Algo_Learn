package com.algolearn.llm;

import static com.algolearn.llm.LlmFakes.httpError;
import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.support.MutableClock;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Ports legacy imageText.test.js. */
class ImageTextReaderTest {

    private static final byte[] PNG = "fake-png".getBytes(StandardCharsets.UTF_8);

    private final MutableClock clock = LlmFakes.clockAt(100);
    private final List<Long> sleeps = new ArrayList<>();
    private final ChainSettings settings = LlmFakes.settings(clock, sleeps, 50);

    private Optional<ImageText> read(ChainSettings s, byte[] image, String mime, Instant deadline,
            FakeProvider... providers) {
        return new ImageTextReader(List.of(providers), s).extractImageText(image, mime, deadline);
    }

    private Optional<ImageText> read(FakeProvider... providers) {
        return read(settings, PNG, "image/png", null, providers);
    }

    @Test
    void returnsTheTextAndTheModelThatReadIt() {
        var gemini = FakeProvider.of("gemini", "a", "A. Theatre Square");
        assertThat(read(gemini)).contains(new ImageText("A. Theatre Square", "gemini", "a"));
        assertThat(gemini.imageCalls).isEqualTo(1);
    }

    @Test
    void movesToTheNextModelAtOnceOnA503() {
        var a = FakeProvider.of("gemini", "a", httpError(503));
        assertThat(read(a, FakeProvider.of("gemini", "b", "text"))).get().extracting(ImageText::model)
                .isEqualTo("b");
        assertThat(a.imageCalls).isEqualTo(1);
        assertThat(sleeps).isEmpty();
    }

    @Test
    void stopsAtTheDeadlineWithoutTryingTheOtherModels() {
        var a = FakeProvider.of("gemini", "a", "text");
        assertThat(read(settings, PNG, "image/png", Instant.ofEpochMilli(100), a)).isEmpty();
        assertThat(a.imageCalls).isZero();
        var b = FakeProvider.of("gemini", "b", "text");
        var hang = FakeProvider.of("gemini", "h", FakeProvider.HANG);
        assertThat(read(settings, PNG, "image/png", Instant.ofEpochMilli(120), hang, b)).isEmpty();
        assertThat(b.imageCalls).isZero();
    }

    @Test
    void treatsAnEmptyTranscriptionAsAFailure() {
        var a = FakeProvider.of("gemini", "a", "");
        assertThat(read(a, FakeProvider.of("gemini", "b", "text"))).get().extracting(ImageText::model)
                .isEqualTo("b");
        assertThat(a.imageCalls).isEqualTo(1);
    }

    @Test
    void skipsProvidersThatCannotReadImages() {
        var groq = FakeProvider.textOnly("groq", "g", "{}");
        assertThat(read(groq)).isEmpty();
        assertThat(groq.imageCalls).isZero();
    }

    @Test
    void returnsEmptyWhenEveryModelFailsOrTheBudgetIsUsedUp() {
        assertThat(read(FakeProvider.of("gemini", "a", httpError(400)))).isEmpty();
        var busy = settings.withBudget(LlmFakes.closedBudget(clock));
        assertThat(read(busy, PNG, "image/png", null, FakeProvider.of("gemini", "a", "x"))).isEmpty();
    }

    @Test
    void returnsEmptyForAnEmptyImageOrAMissingMimeType() {
        var gemini = FakeProvider.of("gemini", "a", "x");
        assertThat(read(settings, new byte[0], "image/png", null, gemini)).isEmpty();
        assertThat(read(settings, PNG, "", null, gemini)).isEmpty();
        assertThat(read(settings, PNG, null, null, gemini)).isEmpty();
        assertThat(read(settings, null, "image/png", null, gemini)).isEmpty();
        assertThat(gemini.imageCalls).isZero();
    }
}
