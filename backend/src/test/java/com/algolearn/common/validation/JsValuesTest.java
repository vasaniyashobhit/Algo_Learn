package com.algolearn.common.validation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

/** JavaScript string trimming and Number() coercion. */
class JsValuesTest {

    @Test
    void trimsLikeJavaScript() {
        assertThat(JsText.trim(" \t\n ﻿  Ada 　\r")).isEqualTo("Ada");
        assertThat(JsText.trim("\u0001x\u0001")).isEqualTo("\u0001x\u0001");
        assertThat(JsText.trim("   ")).isEmpty();
        assertThat(JsText.isBlank(" ")).isTrue();
        assertThat(JsText.byteLength("é")).isEqualTo(2);
        assertThat(JsText.lower("ÀB")).isEqualTo("àb");
        assertThat(JsText.upper("b1")).isEqualTo("B1");
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {"12|12", "' 7 '|7", "1.5|1.5", "-3|-3", "+4|4", "1e3|1000", ".5|0.5",
        "5.|5", "0x10|16", "0o17|15", "0b11|3", "''|0", "'  '|0"})
    void parsesNumbersLikeJavaScript(String text, double expected) {
        assertThat(JsNumber.parse(text)).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "1x", "1,5", "0b12", "--1", "1e", "0x"})
    void givesNaNWhereJavaScriptDoes(String text) {
        assertThat(JsNumber.parse(text)).isNaN();
    }

    @Test
    void handlesInfinityAndIntegers() {
        assertThat(JsNumber.parse("Infinity")).isInfinite();
        assertThat(JsNumber.parse("-Infinity")).isEqualTo(Double.NEGATIVE_INFINITY);
        assertThat(JsNumber.isInteger(3)).isTrue();
        assertThat(JsNumber.isInteger(3.5)).isFalse();
        assertThat(JsNumber.isInteger(Double.POSITIVE_INFINITY)).isFalse();
    }
}
