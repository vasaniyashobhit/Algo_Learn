package com.algolearn.stuck;

import com.algolearn.llm.CoachRequest;
import com.algolearn.llm.CoachResult;
import com.algolearn.llm.FallbackReason;
import com.algolearn.stats.calc.TopicKeys;
import com.algolearn.stuck.gap.GapAnalysis;
import com.algolearn.stuck.input.InputResolver;
import com.algolearn.stuck.input.ResolvedInput;
import com.algolearn.stuck.input.StuckInput;
import com.algolearn.stuck.match.Locator;
import com.algolearn.stuck.match.ProblemMatch;
import com.algolearn.stuck.match.StuckProblem;
import com.algolearn.stuck.result.EasierSimilar;
import com.algolearn.stuck.result.ProblemInfo;
import com.algolearn.stuck.result.ResultBuilder;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

/**
 * Legacy stuck.service solve(): resolve the input → find the problem → coach (AI or fallback) → tags → concept gap →
 * similar problems (easier on gap topics) → save. One {@link StuckConstants#REQUEST_DEADLINE_MS} deadline is shared:
 * input reading uses it first, the coach gets what is left, or is skipped (AI_TIMEOUT) below 10 s.
 */
public class StuckService {

    private static final int MAX_TITLE = 120;

    private final InputResolver resolver;
    private final Function<CoachRequest, CoachResult> coach;
    private final EasierSimilar similar;
    private final StuckRepository repo;
    private final StuckQueryStore store;
    private final Clock clock;

    public StuckService(InputResolver resolver, Function<CoachRequest, CoachResult> coach, EasierSimilar similar,
            StuckRepository repo, StuckQueryStore store, Clock clock) {
        this.resolver = resolver;
        this.coach = coach;
        this.similar = similar;
        this.repo = repo;
        this.store = store;
        this.clock = clock;
    }

    public StuckView.Response solve(UUID userId, StuckInput request) {
        var deadline = clock.instant().plusMillis(StuckConstants.REQUEST_DEADLINE_MS);
        var input = resolver.resolve(request, deadline);
        var locator = new Locator(repo);
        var located = locator.locate(input.problemId(), input.text());
        var match = located.match();
        var text = input.text() != null ? input.text() : match != null ? ProblemMatch.statementOf(match) : "";
        var answer = coachFor(match, input, text, deadline);
        var detected = locator.detectTags(match, answer.answer(), located.neighbors(), text);
        var context = repo.userContext(userId);
        var stats = detected.tags().isEmpty() ? List.<GapAnalysis.TopicStatRow>of() : repo.topicStats(userId,
                TopicKeys.forTags(detected.tags()).stream().map(TopicKeys.TopicKey::topicKey).toList());
        var gap = GapAnalysis.analyze(detected.tags(), stats);
        var block = similar.find(detected.tags(), detected.rating(), gap, match, context);
        var problem = new ProblemInfo(match == null ? null : match.id(), input.problemId(),
                match != null ? match.title() : titleGuess(text), detected.tags(), detected.tagsSource(),
                detected.rating());
        var result = ResultBuilder.build(answer, problem, match == null ? null : match.editorial(), gap, block);
        var gapItems = gap.items().stream().map(t -> new GapItem(t.topicKey(), t.kind(), t.strength(), t.status()))
                .toList();
        var saved = store.save(new NewQuery(userId, request.inputType(), input.rawInput(), problem.matchedProblemId(),
                detected.tags(), detected.tagsSource(), detected.rating(), gapItems, result,
                ResultBuilder.solutionOf(answer.answer()), answer.source()));
        return StuckView.response(saved);
    }

    private CoachResult coachFor(StuckProblem match, ResolvedInput input, String text, Instant deadline) {
        if (deadline.toEpochMilli() - clock.millis() < StuckConstants.COACH_MIN_MS) {
            return CoachResult.fallback(FallbackReason.AI_TIMEOUT);
        }
        return coach.apply(new CoachRequest(match != null ? match.id() : input.problemId(), text,
                match == null ? List.of() : match.tags(), deadline));
    }

    static String titleGuess(String text) {
        var line = ProblemMatch.stripIndexPrefix(ProblemMatch.firstLine(text));
        var title = line.length() > MAX_TITLE ? line.substring(0, MAX_TITLE) : line;
        return title.isEmpty() ? null : title;
    }
}
