package com.algolearn.recommendations;

import com.algolearn.practice.PracticeQueries;
import com.algolearn.recommendations.calc.History;
import com.algolearn.recommendations.calc.SolvedCopies;
import com.algolearn.recommendations.calc.SolvedCopies.ProblemRef;
import com.algolearn.recommendations.calc.TopicFrequency;
import com.algolearn.stats.StatsQueries;
import com.algolearn.users.UserRepository;
import com.algolearn.users.UsersService;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

/** Loads a {@link RecommendationContext} (legacy createContextLoader). A missing account → AUTH_INVALID_TOKEN. */
@Component
public class ContextLoader {

    private final UserRepository users;
    private final StatsQueries stats;
    private final PracticeQueries practice;
    private final RecommendationQueries queries;
    private final TagCountsCache tagCounts;

    public ContextLoader(UserRepository users, StatsQueries stats, PracticeQueries practice,
            RecommendationQueries queries, TagCountsCache tagCounts) {
        this.users = users;
        this.stats = stats;
        this.practice = practice;
        this.queries = queries;
        this.tagCounts = tagCounts;
    }

    public RecommendationContext load(UUID userId) {
        var user = users.findById(userId).orElseThrow(UsersService::accountGone);
        var history = History.summarize(stats.submissions(userId), RecommendationConstants.RECENT_FAILED);
        var singles = stats.all(userId).stream().filter(s -> "single".equals(s.kind())).toList();
        var practiceIds = practice.problemIds(userId);
        var solved = queries.solvedRefs(history.solvedIds());
        var rating = user.getCfRating();
        var excludeIds = new LinkedHashSet<String>();
        Stream.concat(history.solvedIds().stream(), practiceIds.stream()).forEach(excludeIds::add);
        var titles = new LinkedHashSet<String>();
        solved.stream().map(ProblemRef::title).filter(Objects::nonNull).filter(t -> !t.isEmpty()).forEach(titles::add);
        return new RecommendationContext(user.getCfHandle(), user.getLastSyncedAt(), rating, singles,
                TopicFrequency.atRating(tagCounts.get(), rating), history.recentFailed(), excludeIds.stream().toList(),
                titles.stream().toList(), SolvedCopies.matcher(solved));
    }
}
