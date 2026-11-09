package com.algolearn.sync;

import com.algolearn.codeforces.CodeforcesClient;
import com.algolearn.codeforces.dto.CfSubmission;
import java.util.ArrayList;
import java.util.List;

/** Reads new submissions from user.status (legacy fetchNewSubmissions). */
public final class SubmissionPager {

    private SubmissionPager() {
    }

    /**
     * Newest first in pages of {@code pageSize} until a page reaches {@code after} (the last stored
     * id), a page comes back short, or {@code maxPages} pages were read. With {@code after = null}
     * (first sync) that means at most maxPages × pageSize submissions.
     */
    public static Fetched fetch(CodeforcesClient client, String handle, Long after, int pageSize, int maxPages) {
        var collected = new ArrayList<CfSubmission>();
        var pages = 0;
        while (pages < maxPages) {
            var page = client.userStatus(handle, pages * pageSize + 1, pageSize);
            var list = page == null ? List.<CfSubmission>of() : page;
            pages += 1;
            var fresh = after == null ? list : list.stream().filter(s -> s.id() > after).toList();
            collected.addAll(fresh);
            if (list.size() < pageSize || fresh.size() < list.size()) {
                break;
            }
        }
        return new Fetched(collected, pages);
    }

    /** The collected submissions and how many pages were read. */
    public record Fetched(List<CfSubmission> submissions, int pages) {

        public Fetched {
            submissions = List.copyOf(submissions);
        }
    }
}
