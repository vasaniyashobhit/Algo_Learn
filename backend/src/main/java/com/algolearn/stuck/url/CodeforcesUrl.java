package com.algolearn.stuck.url;

import com.algolearn.common.validation.JsText;
import com.algolearn.config.ProblemIds;
import java.math.BigInteger;
import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Legacy parseCodeforcesUrl: the problem id of a Codeforces contest, problemset or gym problem link (no fetch:
 * the id is looked up in our database), or empty.
 */
public final class CodeforcesUrl {

    private static final Pattern HOST = Pattern.compile("^(?:www\\.|m[1-3]\\.)?codeforces\\.(?:com|ru)$",
            Pattern.CASE_INSENSITIVE);
    private static final List<Pattern> PATHS = List.of(
            Pattern.compile("^/contest/(\\d+)/problem/([a-z0-9]{1,3})/?$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^/problemset/problem/(\\d+)/([a-z0-9]{1,3})/?$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^/gym/(\\d+)/problem/([a-z0-9]{1,3})/?$", Pattern.CASE_INSENSITIVE));

    private CodeforcesUrl() {
    }

    public static Optional<String> problemId(URI url) {
        var scheme = url.getScheme() == null ? "" : JsText.lower(url.getScheme());
        var host = url.getHost();
        if (!(scheme.equals("http") || scheme.equals("https")) || host == null || !HOST.matcher(host).matches()) {
            return Optional.empty();
        }
        var path = url.getRawPath() == null ? "" : url.getRawPath();
        for (var pattern : PATHS) {
            var match = pattern.matcher(path);
            if (match.matches()) {
                var id = new BigInteger(match.group(1)) + "/" + JsText.upper(match.group(2));
                return ProblemIds.PROBLEM_ID_PATTERN.matcher(id).matches() ? Optional.of(id) : Optional.empty();
            }
        }
        return Optional.empty();
    }
}
