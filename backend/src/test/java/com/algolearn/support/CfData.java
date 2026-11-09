package com.algolearn.support;

import com.algolearn.codeforces.dto.CfProblem;
import com.algolearn.codeforces.dto.CfSubmission;
import com.algolearn.codeforces.dto.CfUser;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.ExternalServiceException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;

/** Codeforces payload factories (legacy tests/helpers/codeforces.js). Newest submissions have the largest ids. */
public final class CfData {

    private CfData() {
    }

    /** Problem {@code (1000 + id % 7)/A}, rating 1500, tags dp + math, verdict OK. */
    public static CfSubmission submission(long id) {
        return submission(id, "OK");
    }

    public static CfSubmission submission(long id, String verdict) {
        var contest = (int) (1000 + id % 7);
        return submission(id, verdict, new CfProblem(contest, "A", "P" + id, null, 1500, List.of("dp", "math")));
    }

    public static CfSubmission submission(long id, String verdict, CfProblem problem) {
        var contest = (int) (1000 + id % 7);
        return new CfSubmission(id, contest, 1_700_000_000L + id, problem, verdict);
    }

    public static CfProblem problem(Integer contestId, String index) {
        return new CfProblem(contestId, index, "P", null, null, null);
    }

    /** {@code count} submissions with ids start+count−1 … start (newest first, like user.status). */
    public static List<CfSubmission> history(int count, int start) {
        var list = new ArrayList<CfSubmission>();
        for (var i = 0; i < count; i++) {
            list.add(submission(start + count - 1 - i));
        }
        return list;
    }

    public static List<CfSubmission> history(int count) {
        return history(count, 1);
    }

    public static CfUser user(String handle) {
        return new CfUser(handle, 1650, 1800);
    }

    public static CfUser user(String handle, Integer rating, Integer maxRating) {
        return new CfUser(handle, rating, maxRating);
    }

    /** Codeforces answered HTTP 503 (retryable). */
    public static ExternalServiceException down() {
        return new ExternalServiceException(ErrorCode.CF_UNAVAILABLE, "Codeforces answered HTTP 503",
                Map.of("status", 503, "retryable", true), HttpStatus.SERVICE_UNAVAILABLE, null);
    }
}
