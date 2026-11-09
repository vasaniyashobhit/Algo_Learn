package com.algolearn.common.validation;

import java.util.regex.Pattern;

/** JavaScript {@code Number(string)} (what zod's {@code z.coerce.number()} does with query strings). */
public final class JsNumber {

    private static final Pattern DECIMAL = Pattern.compile("^[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?$");
    private static final Pattern PREFIXED = Pattern.compile("^0([xXoObB])([0-9a-fA-F]+)$");

    private JsNumber() {
    }

    /** The number, or NaN when JavaScript would give NaN. Blank text is 0, as in JavaScript. */
    public static double parse(String value) {
        var text = JsText.trim(value);
        if (text.isEmpty()) {
            return 0;
        }
        var unsigned = text.startsWith("+") || text.startsWith("-") ? text.substring(1) : text;
        if (unsigned.equals("Infinity")) {
            return text.startsWith("-") ? Double.NEGATIVE_INFINITY : Double.POSITIVE_INFINITY;
        }
        if (DECIMAL.matcher(text).matches()) {
            return Double.parseDouble(text);
        }
        var prefixed = PREFIXED.matcher(text);
        if (prefixed.matches()) {
            var radix = switch (Character.toLowerCase(prefixed.group(1).charAt(0))) {
                case 'x' -> 16;
                case 'o' -> 8;
                default -> 2;
            };
            try {
                return new java.math.BigInteger(prefixed.group(2), radix).doubleValue();
            } catch (NumberFormatException e) {
                return Double.NaN; // digits outside the radix, e.g. 0b12
            }
        }
        return Double.NaN;
    }

    public static boolean isInteger(double value) {
        return Double.isFinite(value) && value == Math.rint(value);
    }
}
