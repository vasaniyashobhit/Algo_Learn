package com.algolearn.stuck.input;

import java.util.List;
import org.jsoup.Jsoup;

/**
 * Legacy extractMainText (cheerio → jsoup): drops scripts and navigation, adds a line break after every block,
 * then returns the tidied text of the first main-content container that has any (problem statement, main,
 * article, … body).
 */
public final class MainText {

    static final String NOISE = "script, style, noscript, template, nav, header, footer, aside, form, iframe, svg, "
            + "button";
    /** Blocks get a trailing line break; jsoup already turns {@code <br>} into one in wholeText. */
    static final String BLOCKS = "p, div, li, tr, pre, section, article, h1, h2, h3, h4, h5, h6";
    static final List<String> MAIN = List.of(".problem-statement", "main", "article", "[role=main]", "#content",
            "body");

    private MainText() {
    }

    public static String extract(String html) {
        var doc = Jsoup.parse(html == null ? "" : html);
        doc.select(NOISE).remove();
        doc.select(BLOCKS).forEach(element -> element.appendText("\n"));
        for (var selector : MAIN) {
            var first = doc.selectFirst(selector);
            var text = first == null ? "" : TextTidy.tidy(first.wholeText());
            if (!text.isEmpty()) {
                return text;
            }
        }
        return "";
    }
}
