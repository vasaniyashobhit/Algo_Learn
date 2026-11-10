package com.algolearn.e2e;

import java.io.IOException;
import org.springframework.boot.context.TypeExcludeFilter;
import org.springframework.core.type.classreading.MetadataReader;
import org.springframework.core.type.classreading.MetadataReaderFactory;

/**
 * Outside the JUnit runner nothing hides test-source beans (TestDoubles, TestRoutes, ...) from the app's component
 * scan. This filter drops every class compiled from test sources except this package, so the E2E backend is the
 * production app plus {@link E2eConfig} only.
 */
class TestClassExcludeFilter extends TypeExcludeFilter {

    static final String TEST_CLASSES = "/test-classes/";
    static final String KEEP = E2eConfig.class.getPackageName() + ".";

    @Override
    public boolean match(MetadataReader reader, MetadataReaderFactory factory) throws IOException {
        var className = reader.getClassMetadata().getClassName();
        var location = reader.getResource().getURL().toString().replace('\\', '/');
        return location.contains(TEST_CLASSES) && !className.startsWith(KEEP);
    }

    @Override
    public boolean equals(Object other) {
        return other != null && getClass() == other.getClass();
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
