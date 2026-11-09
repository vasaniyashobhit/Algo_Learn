package com.algolearn.common.error.mapping;

import com.algolearn.common.error.AppException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;

/** Turns one family of library exceptions into an {@link AppException}; empty when not its family. */
public interface ErrorMapper {

    Optional<AppException> map(Throwable error, HttpServletRequest request);
}
