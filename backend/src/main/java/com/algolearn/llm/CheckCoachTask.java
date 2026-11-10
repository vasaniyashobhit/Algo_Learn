package com.algolearn.llm;

import com.algolearn.llm.cache.CoachCache;
import com.algolearn.llm.chain.ChainSettings;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.tasks.Task;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.boot.ApplicationArguments;
import org.springframework.stereotype.Component;

/**
 * {@code --task=check-coach [--fresh]} (legacy {@code npm run check:coach}): one real coach call on problem 1/A
 * with the configured keys. Prints source/provider/model/time only, never a key. {@code --fresh} skips the
 * cache read (the answer is still written). Uses a built-in 1/A statement when the problem is not imported.
 */
@Component
public class CheckCoachTask implements Task {

    static final String PROBLEM_ID = "1/A";
    static final String FALLBACK_TEXT = String.join("\n\n", "Theatre Square",
            "Theatre Square in the capital city of Berland has a rectangular shape with the size n × m meters. "
                    + "On the occasion of the city's anniversary, a decision was taken to pave the Square with "
                    + "square granite flagstones. Each flagstone is of the size a × a. What is the least number of "
                    + "flagstones needed to pave the Square? It's allowed to cover the surface larger than the "
                    + "Theatre Square, but the Square has to be covered. It's not allowed to break the flagstones. "
                    + "The sides of flagstones should be parallel to the sides of the Square.",
            "The input contains three positive integer numbers in the first line: n, m and a (1 ≤ n, m, a ≤ 10^9).",
            "Write the needed number of flagstones.");

    private final Llm llm;
    private final CoachCache cache;
    private final ChainSettings settings;
    private final ProblemRepository problems;
    private final ApplicationArguments args;
    private final Clock clock;

    public CheckCoachTask(Llm llm, CoachCache cache, ChainSettings settings, ProblemRepository problems,
            ApplicationArguments args, Clock clock) {
        this.llm = llm;
        this.cache = cache;
        this.settings = settings;
        this.problems = problems;
        this.args = args;
        this.clock = clock;
    }

    @Override
    public String name() {
        return "check-coach";
    }

    @Override
    public Map<String, Object> run() {
        var problem = problems.findById(PROBLEM_ID);
        var text = problem.map(p -> Stream.of(p.getTitle(), p.getDescription(), p.getInputFormat(),
                p.getOutputFormat(), p.getNote()).filter(s -> s != null && !s.isEmpty())
                .collect(Collectors.joining("\n\n"))).orElse(FALLBACK_TEXT);
        var tags = problem.map(p -> List.copyOf(p.getTags())).orElse(List.of("math"));
        var fresh = args.containsOption("fresh");
        var coach = fresh ? new Llm(llm.providers(), new WriteOnly(cache), settings) : llm;
        var started = clock.millis();
        var result = coach.getCoachAnswer(new CoachRequest(PROBLEM_ID, text, tags, null));
        var summary = new java.util.LinkedHashMap<String, Object>();
        summary.put("providers", llm.providers().stream().map(p -> p.name() + ":" + p.model()).toList());
        summary.put("statement", problem.isPresent() ? "database" : "built-in");
        summary.put("fresh", fresh);
        summary.put("source", result.source());
        summary.put("provider", Objects.requireNonNullElse(result.provider(), "-"));
        summary.put("model", Objects.requireNonNullElse(result.model(), "-"));
        Optional.ofNullable(result.reason()).ifPresent(r -> summary.put("reason", r.name()));
        summary.put("tookMs", clock.millis() - started);
        Optional.ofNullable(result.answer()).ifPresent(a -> {
            summary.put("tags", a.tags());
            summary.put("estimatedRating", a.estimatedRating());
            summary.put("firstHint", a.hints().getFirst());
            summary.put("complexity", a.complexity());
            summary.put("codeLines", a.code() == null ? 0 : a.code().split("\n", -1).length);
        });
        return summary;
    }

    /** Skips the cache read, still writes (legacy {@code --fresh}). */
    private record WriteOnly(CoachCache cache) implements CoachCache {
        @Override
        public Optional<CachedAnswer> get(String key) {
            return Optional.empty();
        }

        @Override
        public void set(String key, CachedAnswer value) {
            cache.set(key, value);
        }
    }
}
