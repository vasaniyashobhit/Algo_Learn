package com.algolearn.meta;

import com.algolearn.common.web.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/v1/meta/tags. */
@RestController
@RequestMapping("/api/v1/meta")
public class MetaController {

    private final MetaService service;

    public MetaController(MetaService service) {
        this.service = service;
    }

    @GetMapping("/tags")
    public ApiResponse<TagLists> tags() {
        return ApiResponse.ok(service.tags());
    }
}
