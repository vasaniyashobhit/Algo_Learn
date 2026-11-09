package com.algolearn.problems;

import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.NotFoundException;
import com.algolearn.problems.ProblemParams.SimilarParams;
import com.algolearn.problems.dto.ProblemDetail;
import com.algolearn.problems.dto.ProblemSummary;
import com.algolearn.problems.similar.SimilarMeta.SourceProblem;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.problems.similar.SimilarSearch.SimilarRequest;
import com.algolearn.problems.similar.SimilarSearch.SimilarResult;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Browsing and similar search (legacy problems.service). */
@Service
public class ProblemService {

    private final ProblemRepository problems;
    private final ProblemListQueries listQueries;
    private final SimilarSearch similar;

    public ProblemService(ProblemRepository problems, ProblemListQueries listQueries, SimilarSearch similar) {
        this.problems = problems;
        this.listQueries = listQueries;
        this.similar = similar;
    }

    public static NotFoundException notFound(String id) {
        return new NotFoundException(ErrorCode.PROBLEM_NOT_FOUND, "Problem " + id + " was not found");
    }

    /** One page without statement text; meta has page, limit, total, totalPages. */
    @Transactional(readOnly = true)
    public Page list(ListQuery query) {
        var size = Math.min(query.limit(), ProblemConstants.MAX_LIMIT);
        var items = listQueries.page(query, (query.page() - 1) * size, size);
        var total = listQueries.count(query);
        return new Page(items, new PageMeta(query.page(), size, total, (total + size - 1) / size));
    }

    @Transactional(readOnly = true)
    public ProblemDetail getById(String id) {
        return problems.findById(id).map(ProblemDetail::of).orElseThrow(() -> notFound(id));
    }

    /** Similar to a stored problem, excluding itself and problems with the exact same title. */
    @Transactional(readOnly = true)
    public SimilarResult findSimilarToProblem(SimilarParams params) {
        var source = problems.findById(params.id()).orElseThrow(() -> notFound(params.id()));
        var tags = source.getTags() == null ? List.<String>of() : source.getTags();
        var result = similar.find(new SimilarRequest(tags, source.getRating(), null, List.of(params.id()),
                List.of(source.getTitle()), params.k(), params.ratingWindow()));
        var problem = new SourceProblem(params.id(), source.getTitle(), source.getRating(), tags);
        return new SimilarResult(result.items(), result.meta().withProblem(problem));
    }

    /** A page of summaries. */
    public record Page(List<ProblemSummary> items, PageMeta meta) {
    }

    /** {@code { page, limit, total, totalPages }}. */
    public record PageMeta(int page, int limit, long total, long totalPages) {
    }
}
