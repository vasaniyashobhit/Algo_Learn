package com.algolearn.stuck.input;

import static com.algolearn.stuck.StuckFixtures.html;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Legacy extractMainText.test.js: tidyText and extractMainText. */
class TextAndHtmlTest {

    @Test
    void tidyCollapsesSpacesPerLineBlankRunsAndCrlfThenTrims() {
        assertThat(TextTidy.tidy("  a \t  b \r\n\r\n\r\n\n c  \n")).isEqualTo("a b\n\nc");
        assertThat(TextTidy.tidy("x  y")).isEqualTo("x y");
        assertThat(TextTidy.tidy(null)).isEmpty();
        assertThat(TextTidy.cap("abcdef", 3)).isEqualTo("abc");
        assertThat(TextTidy.cap("ab", 3)).isEqualTo("ab");
    }

    @Test
    void prefersTheCodeforcesStatementAndDropsScriptsAndNavigation() {
        var page = html("""
                <nav>Home | Contests</nav>
                <div class="problem-statement"><div class="title">A. Theatre Square</div><p>Find   the number.</p></div>
                <footer>Copyright</footer>""");
        assertThat(MainText.extract(page)).isEqualTo("A. Theatre Square\nFind the number.");
    }

    @Test
    void fallsBackToMainArticleThenBody() {
        assertThat(MainText.extract(html("<header>x</header><main><p>In main</p></main><p>outside</p>")))
                .isEqualTo("In main");
        assertThat(MainText.extract(html("<article><h1>T</h1><p>Body</p></article>"))).isEqualTo("T\nBody");
        assertThat(MainText.extract(html("<p>Just body</p><style>p{}</style>"))).isEqualTo("Just body");
        assertThat(MainText.extract(html("<p>a<br>b</p>"))).isEqualTo("a\nb");
    }

    @Test
    void skipsAnEmptyMainContainer() {
        assertThat(MainText.extract(html("<main>  </main><div>rest</div>"))).isEqualTo("rest");
    }

    @Test
    void returnsAnEmptyStringForAPageWithoutText() {
        assertThat(MainText.extract("<html><body><script>1</script></body></html>")).isEmpty();
        assertThat(MainText.extract(null)).isEmpty();
    }
}
