package com.algolearn.llm;

import com.algolearn.llm.provider.LlmProvider;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;

/**
 * Fake provider (legacy fakeProvider). Each step is a String (returned), a RuntimeException (thrown) or
 * {@link #HANG} (the call never ends: {@link FakeLimiter} turns it into a timeout). The last step repeats.
 */
public final class FakeProvider implements LlmProvider {

    public static final Object HANG = new Object();

    private final String name;
    private final String model;
    private final LinkedList<Object> steps;
    private final boolean images;
    public final List<String> prompts = new ArrayList<>();
    public int jsonCalls;
    public int imageCalls;

    private FakeProvider(String name, String model, boolean images, Object... steps) {
        this.name = name;
        this.model = model;
        this.images = images;
        this.steps = new LinkedList<>(Arrays.asList(steps));
    }

    public static FakeProvider of(String name, String model, Object... steps) {
        return new FakeProvider(name, model, true, steps);
    }

    /** Like Groq: no image reading. */
    public static FakeProvider textOnly(String name, String model, Object... steps) {
        return new FakeProvider(name, model, false, steps);
    }

    @Override
    public String name() {
        return name;
    }

    @Override
    public String model() {
        return model;
    }

    @Override
    public String generateJson(String prompt) {
        jsonCalls++;
        prompts.add(prompt);
        return next();
    }

    @Override
    public boolean readsImages() {
        return images;
    }

    @Override
    public String extractTextFromImage(byte[] image, String mimeType) {
        imageCalls++;
        return next();
    }

    private String next() {
        var step = steps.size() > 1 ? steps.removeFirst() : steps.getFirst();
        if (step == HANG) {
            throw new FakeLimiter.Hang();
        }
        if (step instanceof RuntimeException failure) {
            throw failure;
        }
        return (String) step;
    }
}
