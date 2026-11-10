package com.algolearn.llm;

/** Text a model read from a screenshot, and which model read it. */
public record ImageText(String text, String provider, String model) {
}
