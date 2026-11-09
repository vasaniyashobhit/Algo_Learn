package com.algolearn.common.error.mapping;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Normalizes any thrown value into an AppException. Unknown errors become 500 INTERNAL_ERROR. */
@Component
public class ExceptionMapper {

    public static final String GENERIC_MESSAGE = "Something went wrong on our side";

    private final List<ErrorMapper> mappers;

    public ExceptionMapper(List<ErrorMapper> mappers) {
        this.mappers = List.copyOf(mappers);
    }

    public AppException toAppException(Throwable error, HttpServletRequest request) {
        if (error instanceof AppException app) {
            return app;
        }
        return mappers.stream()
                .flatMap(mapper -> mapper.map(error, request).stream())
                .findFirst()
                .orElseGet(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_ERROR,
                        GENERIC_MESSAGE, null, error));
    }
}
