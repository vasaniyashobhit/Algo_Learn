package com.algolearn.tasks;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.json.JsonMapper;

/** Ports legacy runAsMain cases: exit 0 on success, 1 on failure. Uses a tiny context, no database. */
class TaskLauncherTest {

    private static final String[] PROFILE = {"--spring.profiles.active=test"};

    @Test
    void readsTheTaskNameFromTheArguments() {
        assertThat(TaskLauncher.taskName(new String[] {"--x=1", "--task=import-dataset"})).contains("import-dataset");
        assertThat(TaskLauncher.taskName(new String[] {"--tasks=1"})).isEmpty();
    }

    @Test
    void exitsWith0WhenTheTaskSucceeds() {
        assertThat(TaskLauncher.launch(Tasks.class, args("--task=ok"))).isZero();
    }

    @Test
    void exitsWith1WhenTheTaskFailsOrIsUnknown() {
        assertThat(TaskLauncher.launch(Tasks.class, args("--task=fail"))).isEqualTo(1);
        assertThat(TaskLauncher.launch(Tasks.class, args("--task=nope"))).isEqualTo(1);
    }

    private static String[] args(String task) {
        return new String[] {PROFILE[0], task};
    }

    /** A context with two tasks and the runner. */
    @Configuration(proxyBeanMethods = false)
    static class Tasks {

        @Bean
        TaskRunner taskRunner(List<Task> tasks) {
            return new TaskRunner(tasks, JsonMapper.builder().build());
        }

        @Bean
        Task ok() {
            return task("ok", false);
        }

        @Bean
        Task fail() {
            return task("fail", true);
        }

        private static Task task(String name, boolean fails) {
            return new Task() {
                @Override
                public String name() {
                    return name;
                }

                @Override
                public Object run() {
                    if (fails) {
                        throw new IllegalStateException("boom");
                    }
                    return Map.of();
                }
            };
        }
    }
}
