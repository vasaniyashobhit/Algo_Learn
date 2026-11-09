package com.algolearn;

import com.algolearn.tasks.TaskLauncher;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** AlgoLearn API entry point. {@code --task=<name>} runs a one-off task instead and exits. */
@SpringBootApplication
public class AlgoLearnApplication {

    public static void main(String[] args) {
        if (TaskLauncher.taskName(args).isPresent()) {
            System.exit(TaskLauncher.launch(AlgoLearnApplication.class, args));
        }
        SpringApplication.run(AlgoLearnApplication.class, args);
    }
}
