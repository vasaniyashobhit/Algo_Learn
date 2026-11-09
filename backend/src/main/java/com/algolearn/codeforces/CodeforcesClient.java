package com.algolearn.codeforces;

import com.algolearn.codeforces.dto.CfProblemset;
import com.algolearn.codeforces.dto.CfSubmission;
import com.algolearn.codeforces.dto.CfUser;
import java.util.List;

/**
 * Codeforces API. Every failure is a typed AppException: CF_HANDLE_NOT_FOUND (404) or
 * CF_UNAVAILABLE (502/503). Tests inject a fake or point the real client at WireMock.
 */
public interface CodeforcesClient {

    /** {@code problemset.problems}, optionally filtered by tags (null or empty: all problems). */
    CfProblemset problemsetProblems(List<String> tags);

    default CfProblemset problemsetProblems() {
        return problemsetProblems(null);
    }

    /** {@code user.info} for one or more handles. */
    List<CfUser> userInfo(List<String> handles);

    default List<CfUser> userInfo(String handle) {
        return userInfo(List.of(handle));
    }

    /** {@code user.status}: submissions newest first; {@code from} is 1-based, null count means all. */
    List<CfSubmission> userStatus(String handle, int from, Integer count);

    default List<CfSubmission> userStatus(String handle) {
        return userStatus(handle, 1, null);
    }
}
