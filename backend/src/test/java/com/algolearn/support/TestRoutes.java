package com.algolearn.support;

import com.algolearn.common.error.ConflictException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.web.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Test-only routes that throw on purpose, to drive the real error path end to end. */
@RestController
@RequestMapping("/api/v1/__test")
public class TestRoutes {

    @GetMapping("/conflict")
    public void conflict() {
        throw new ConflictException(ErrorCode.PRACTICE_ITEM_EXISTS, "Already in your list", Map.of("problemId", "1/A"));
    }

    @GetMapping("/unknown")
    public void unknown() {
        throw new IllegalStateException("jdbc:postgresql://admin:hunter2@db exploded");
    }

    @GetMapping("/db")
    public void db() {
        throw new CannotGetJdbcConnectionException("Connection refused");
    }

    @PostMapping("/body")
    public ApiResponse<Sample> body(@Valid @RequestBody Sample sample) {
        return ApiResponse.ok(sample, Map.of("echo", true));
    }

    @GetMapping("/params/{id}")
    public ApiResponse<Integer> params(@PathVariable @Min(1) int id, @RequestParam @Max(50) int limit) {
        return ApiResponse.ok(id + limit);
    }

    /** A request body with two validated fields. */
    public record Sample(@NotBlank @Email String email, @Min(1) int count) {
    }
}
