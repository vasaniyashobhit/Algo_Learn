package com.algolearn.problems.similar;

import com.fasterxml.jackson.annotation.JsonValue;

/** {@code meta.strategy} values, in the order they are tried. */
public enum Strategy {
    PRIMARY("primary"),
    WIDENED_WINDOW("widened_window"),
    NO_RATING_FILTER("no_rating_filter"),
    RATING_BAND("rating_band"),
    NEAR_USER_RATING("near_user_rating");

    private final String value;

    Strategy(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }
}
