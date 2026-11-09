package com.algolearn.common.validation;

import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Registers the {@link JsonBody} argument resolver. */
@Configuration(proxyBeanMethods = false)
public class ValidationWebConfig implements WebMvcConfigurer {

    private final JsonBodyResolver resolver;

    public ValidationWebConfig(JsonBodyResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(resolver);
    }
}
