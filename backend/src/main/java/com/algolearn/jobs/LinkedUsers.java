package com.algolearn.jobs;

import java.util.List;
import java.util.UUID;

/** The ids of every user with a linked Codeforces handle, oldest account first. */
@FunctionalInterface
public interface LinkedUsers {

    List<UUID> ids();
}
