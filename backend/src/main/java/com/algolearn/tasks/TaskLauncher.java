package com.algolearn.tasks;

import java.util.Arrays;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;

/** Starts the app without a web server for a {@code --task=<name>} run and returns the exit code. */
public final class TaskLauncher {

    private static final Logger LOG = LoggerFactory.getLogger(TaskLauncher.class);
    private static final String PREFIX = "--" + TaskRunner.OPTION + "=";

    private TaskLauncher() {
    }

    /** The task name when the arguments ask for one. */
    public static Optional<String> taskName(String[] args) {
        return Arrays.stream(args).filter(a -> a.startsWith(PREFIX)).map(a -> a.substring(PREFIX.length()))
                .findFirst();
    }

    /** 0 when the task succeeded, 1 (with "<task> failed: <message>" logged) when it failed. */
    public static int launch(Class<?> source, String[] args) {
        var name = taskName(args).orElse("task");
        var app = new SpringApplication(source);
        app.setWebApplicationType(WebApplicationType.NONE);
        app.setBannerMode(Banner.Mode.OFF);
        try (var context = app.run(args)) {
            return SpringApplication.exit(context);
        } catch (RuntimeException e) {
            LOG.error("{} failed: {}", name, e.getMessage());
            return 1;
        }
    }
}
