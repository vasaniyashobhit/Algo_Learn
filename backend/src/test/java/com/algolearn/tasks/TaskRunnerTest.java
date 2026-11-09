package com.algolearn.tasks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import tools.jackson.databind.json.JsonMapper;

/** Ports legacy runScript.test.js (run, print, re-throw). */
class TaskRunnerTest {

    private final AtomicInteger runs = new AtomicInteger();

    private Task task(String name, Runnable body) {
        return new Task() {
            @Override
            public String name() {
                return name;
            }

            @Override
            public Object run() {
                runs.incrementAndGet();
                body.run();
                return Map.of("ok", true);
            }
        };
    }

    private TaskRunner runner(Task... tasks) {
        return new TaskRunner(List.of(tasks), JsonMapper.builder().build());
    }

    @Test
    void runsTheNamedTaskAndReturnsItsSummary() {
        var runner = runner(task("demo", () -> { }), task("other", () -> { }));
        assertThat(runner.run("demo")).isEqualTo(Map.of("ok", true));
        assertThat(runs).hasValue(1);
    }

    @Test
    void runsFromTheTaskArgumentAndDoesNothingWithoutIt() {
        var runner = runner(task("demo", () -> { }));
        runner.run(new DefaultApplicationArguments());
        assertThat(runs).hasValue(0);
        runner.run(new DefaultApplicationArguments("--task=demo"));
        assertThat(runs).hasValue(1);
    }

    @Test
    void rejectsAnUnknownTaskListingTheKnownOnes() {
        assertThatThrownBy(() -> runner(task("b", () -> { }), task("a", () -> { })).run("nope"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unknown task \"nope\". Known tasks: a, b");
    }

    @Test
    void reThrowsWhenTheTaskFails() {
        var boom = new IllegalStateException("boom");
        assertThatThrownBy(() -> runner(task("demo", () -> {
            throw boom;
        })).run("demo")).isSameAs(boom);
    }
}
