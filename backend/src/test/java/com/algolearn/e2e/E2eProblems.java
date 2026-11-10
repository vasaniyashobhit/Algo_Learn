package com.algolearn.e2e;

import com.algolearn.importer.ProblemDoc;
import java.util.ArrayList;
import java.util.List;

/** The 24 seeded problems (legacy e2e/server/seedProblems.js and stuckFixture.js, same text). */
public final class E2eProblems {

    public static final String STUCK_TITLE = "Balanced Bracket Splits";
    public static final String STUCK_STATEMENT = "You are given a bracket sequence s of length n. Split it into the "
            + "minimum number of contiguous parts so that every part is a balanced bracket sequence, or report -1.";

    record Row(int contestId, String title, int rating, List<String> tags) {
    }

    static final List<Row> ROWS = List.of(
            new Row(1500, STUCK_TITLE, 1300, List.of("greedy", "strings")),
            new Row(1501, "Prefix Sums Party", 1000, List.of("implementation", "math")),
            new Row(1502, "Knapsack on a Budget", 1500, List.of("dp")),
            new Row(1503, "Shortest Ride Home", 1600, List.of("graphs", "shortest paths")),
            new Row(1504, "Binary Search the Answer", 1400, List.of("binary search", "greedy")),
            new Row(1505, "Bitmask Seating", 1800, List.of("bitmasks", "dp")),
            new Row(1506, "Tree Diameter Walk", 1700, List.of("dfs and similar", "trees")),
            new Row(1507, "Sorting Socks", 900, List.of("sortings", "greedy")),
            new Row(1508, "Counting Pairs", 1200, List.of("math", "two pointers")),
            new Row(1509, "Coloured Strings", 1100, List.of("strings", "implementation")),
            new Row(1510, "Gcd Grid", 1300, List.of("number theory", "math")),
            new Row(1511, "Greedy Coins", 1000, List.of("greedy")),
            new Row(1512, "Interval Merge", 1400, List.of("sortings", "greedy")),
            new Row(1513, "Matrix Paths", 1500, List.of("dp", "math")),
            new Row(1514, "Union of Towns", 1600, List.of("dsu", "graphs")),
            new Row(1515, "Palindrome Pieces", 1200, List.of("strings", "greedy")),
            new Row(1516, "Brackets Again", 1400, List.of("greedy", "strings", "data structures")),
            new Row(1517, "Stack of Plates", 1100, List.of("data structures", "implementation")),
            new Row(1518, "Prime Steps", 1000, List.of("number theory")),
            new Row(1519, "Two Arrays", 900, List.of("constructive algorithms", "greedy")),
            new Row(1520, "Even Odd Game", 800, List.of("games", "math")),
            new Row(1521, "Segment Queries", 1900, List.of("data structures", "binary search")),
            new Row(1522, "Grid Flood", 1300, List.of("dfs and similar", "graphs")),
            new Row(1523, "Long Brackets", 1200, List.of("greedy", "strings")));

    private E2eProblems() {
    }

    /** Every third problem (index 0, 3, ...) has an editorial; the rest store '' (legacy: field absent). */
    public static List<ProblemDoc> docs() {
        var docs = new ArrayList<ProblemDoc>();
        for (var i = 0; i < ROWS.size(); i++) {
            var row = ROWS.get(i);
            var description = row.contestId() == 1500 ? STUCK_STATEMENT
                    : row.title() + ": given $$$n$$$ numbers, answer the question.";
            var editorial = i % 3 == 0 ? "Editorial for " + row.title()
                    + ". Scan left to right, keep a running balance, and cut whenever it returns to 0." : "";
            docs.add(new ProblemDoc(row.contestId() + "/A", row.contestId(), "A", row.title(), description,
                    "The first line contains $$$n$$$ ($$$1 \\le n \\le 2 \\cdot 10^5$$$).", "Print one integer.", "",
                    editorial, row.rating(), row.tags(), row.tags().size(), !editorial.isEmpty(),
                    ProblemDoc.SOURCE_HF));
        }
        return docs;
    }
}
