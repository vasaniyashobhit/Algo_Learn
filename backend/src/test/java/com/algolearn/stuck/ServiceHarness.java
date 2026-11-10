package com.algolearn.stuck;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.algolearn.llm.CoachRequest;
import com.algolearn.llm.CoachResult;
import com.algolearn.llm.FallbackReason;
import com.algolearn.llm.LlmFakes;
import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.problems.similar.SimilarMeta;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.problems.similar.SimilarSearch.SimilarRequest;
import com.algolearn.problems.similar.Strategy;
import com.algolearn.stuck.gap.GapAnalysis.TopicStatRow;
import com.algolearn.stuck.input.InputResolver;
import com.algolearn.stuck.input.ResolvedInput;
import com.algolearn.stuck.match.StuckProblem;
import com.algolearn.stuck.result.EasierSimilar;
import com.algolearn.support.MutableClock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;
import org.mockito.ArgumentCaptor;

/** Legacy tests/helpers/stuckService.js: solve() with a fake resolver, coach, repository, store and similar search. */
public final class ServiceHarness {

    public static final UUID USER_ID = UUID.randomUUID();

    public final MutableClock clock = LlmFakes.clockAt(1_000);
    public final InputResolver resolver = mock(InputResolver.class);
    public final StuckRepository repo = mock(StuckRepository.class);
    public final StuckQueryStore store = mock(StuckQueryStore.class);
    public final SimilarSearch similar = mock(SimilarSearch.class);
    public final List<CoachRequest> coachCalls = new ArrayList<>();
    public final ArgumentCaptor<NewQuery> saved = ArgumentCaptor.forClass(NewQuery.class);
    public final ArgumentCaptor<SimilarRequest> similarCalls = ArgumentCaptor.forClass(SimilarRequest.class);
    public CoachResult coach = CoachResult.fallback(FallbackReason.AI_UNAVAILABLE);

    public ServiceHarness(ResolvedInput resolved, List<StuckProblem> problems, List<StuckProblem> search,
            List<TopicStatRow> stats, Integer userRating, List<String> solvedIds) {
        when(resolver.resolve(any(), any())).thenReturn(resolved);
        when(repo.findProblem(anyString())).thenAnswer(call -> problems.stream()
                .filter(p -> p.id().equals(call.getArgument(0))).findFirst());
        when(repo.searchProblems(anyString(), anyInt())).thenReturn(search);
        when(repo.topicStats(any(), any())).thenReturn(stats);
        when(repo.userContext(any())).thenReturn(new StuckRepository.UserContext(userRating, solvedIds));
        when(store.save(saved.capture())).thenAnswer(call -> stored(call.getArgument(0)));
        when(similar.find(similarCalls.capture())).thenAnswer(call -> {
            SimilarRequest request = call.getArgument(0);
            var item = new ProblemSummary("4/A", 4, "A", "Watermelon", 800, List.of("math"), true, "hf", null);
            var meta = new SimilarMeta(Strategy.PRIMARY, List.of(Strategy.PRIMARY), 300,
                    request.rating() == null ? 1200 : request.rating(), 1, null);
            return new SimilarSearch.SimilarResult(List.of(item), meta);
        });
    }

    public ServiceHarness(ResolvedInput resolved) {
        this(resolved, List.of(), List.of(), List.of(), 1200, List.of());
    }

    public StuckService service() {
        return service(resolver, request -> coach);
    }

    /** With a real resolver and/or coach; every coach request is recorded. */
    public StuckService service(InputResolver inputs, Function<CoachRequest, CoachResult> answer) {
        Function<CoachRequest, CoachResult> recorded = request -> {
            coachCalls.add(request);
            return answer.apply(request);
        };
        return new StuckService(inputs, recorded, new EasierSimilar(similar), repo, store, clock);
    }

    public static StoredQuery stored(NewQuery q) {
        return new StoredQuery(UUID.randomUUID(), q.inputType(), Instant.parse("2026-10-30T12:00:00Z"), q.source(),
                q.matchedProblemId(), q.detectedTags(), q.tagsSource(), q.estimatedRating(), q.gap(), q.result(),
                q.solution());
    }
}
