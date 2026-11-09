package com.algolearn.importer;

import com.algolearn.codeforces.dto.CfProblem;
import com.algolearn.config.Tags;
import java.util.Set;

/**
 * Maps a Codeforces API problem to a "cf_api" document (legacy fromCfProblem). The API has no
 * statements, so text stays empty. Tags Codeforces adds in the future are dropped instead of
 * rejecting the problem. A missing contestId gives an invalid id ("null/A") that is rejected later.
 */
public final class FromCfProblem {

    private static final Set<String> KNOWN_TAGS = Set.copyOf(Tags.ALL_TAGS);
    private static final CfProblem NONE = new CfProblem(null, null, null, null, null, null);

    private FromCfProblem() {
    }

    public static ProblemDoc map(CfProblem problem) {
        var cf = problem == null ? NONE : problem;
        var contestId = CleanProblem.toIntOrNull(cf.contestId());
        var index = CleanProblem.cleanText(cf.index());
        var tags = CleanProblem.cleanTags(cf.tags()).stream().filter(KNOWN_TAGS::contains).toList();
        return ProblemDoc.of(contestId + "/" + index, contestId, index, CleanProblem.cleanText(cf.name()),
                ProblemDoc.Text.EMPTY, CleanProblem.toIntOrNull(cf.rating()), tags, ProblemDoc.SOURCE_CF_API);
    }
}
