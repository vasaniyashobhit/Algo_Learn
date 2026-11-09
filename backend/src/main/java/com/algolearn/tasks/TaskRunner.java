package com.algolearn.tasks;

import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Runs the task named by {@code --task} after startup and prints its summary (legacy runScript).
 * Does nothing when the argument is absent (normal server start). Errors are logged and re-thrown
 * so {@link TaskLauncher} exits with code 1.
 */
@Component
public class TaskRunner implements ApplicationRunner {

    static final String OPTION = "task";
    private static final Logger LOG = LoggerFactory.getLogger(TaskRunner.class);
    /** Its own logger so the summary prints even when LOG_LEVEL is warn (see application.yml). */
    private static final Logger SUMMARY = LoggerFactory.getLogger("algolearn.task.summary");

    private final List<Task> tasks;
    private final JsonMapper mapper;

    public TaskRunner(List<Task> tasks, JsonMapper mapper) {
        this.tasks = tasks;
        this.mapper = mapper;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (args.containsOption(OPTION)) {
            run(args.getOptionValues(OPTION).getFirst());
        }
    }

    /** Runs one task by name and returns its summary. */
    public Object run(String name) {
        var task = tasks.stream().filter(t -> t.name().equals(name)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown task \"%s\". Known tasks: %s".formatted(name,
                        tasks.stream().map(Task::name).sorted().collect(Collectors.joining(", ")))));
        try {
            var summary = task.run();
            SUMMARY.info("\n{} summary\n{}", name, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(summary));
            return summary;
        } catch (RuntimeException e) {
            LOG.error("{} failed", name, e);
            throw e;
        }
    }
}
