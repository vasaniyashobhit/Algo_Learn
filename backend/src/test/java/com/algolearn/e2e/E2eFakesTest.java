package com.algolearn.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.algolearn.common.error.NotFoundException;
import com.algolearn.stuck.input.OcrEngine;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.core.type.classreading.SimpleMetadataReaderFactory;

/** The E2E backend's fakes behave like the legacy e2e/server ones. */
class E2eFakesTest {

    private static final Clock NOW = Clock.fixed(Instant.ofEpochSecond(2_000_000_000L), ZoneOffset.UTC);

    @Test
    void onlyTheE2eFlagStartsTheBackend() {
        assertThat(E2eApplication.isEnabled("1")).isTrue();
        assertThat(E2eApplication.isEnabled(null)).isFalse();
        assertThat(E2eApplication.isEnabled("true")).isFalse();
    }

    @Test
    void handlesStartingWithE2eExistAndOthersAreNotFound() {
        var cf = new E2eCodeforces(NOW);
        assertThat(cf.userInfo(List.of("E2E_abc")).getFirst().rating()).isEqualTo(1450);
        assertThat(catchThrowable(() -> cf.userInfo(List.of("tourist")))).isInstanceOf(NotFoundException.class);
        assertThat(cf.problemsetProblems(null).problems()).isEmpty();
    }

    @Test
    void historyIsNewestFirstOverTheSeededProblemsWithOneIdRangePerHandle() {
        var history = E2eCodeforces.history(900_000, 2_000_000_000L);
        assertThat(history).hasSize(23);
        assertThat(history.getFirst().id()).isEqualTo(900_022);
        assertThat(history.getLast().problem().contestId()).isEqualTo(1501);
        assertThat(history.getFirst().creationTimeSeconds()).isGreaterThan(history.getLast().creationTimeSeconds());
        var cf = new E2eCodeforces(NOW);
        assertThat(cf.userStatus("e2e_a", 1, 5)).hasSize(5).first().extracting(s -> s.id()).isEqualTo(1_000_022L);
        assertThat(cf.userStatus("E2E_A", 21, null)).hasSize(3);
        assertThat(cf.userStatus("e2e_b", 1, null).getFirst().id()).isEqualTo(1_001_022L);
    }

    @Test
    void seedsTwentyFourProblemsWithAnEditorialOnEveryThird() {
        var docs = E2eProblems.docs();
        assertThat(docs).hasSize(24);
        assertThat(docs.getFirst().description()).isEqualTo(E2eProblems.STUCK_STATEMENT);
        assertThat(docs.stream().filter(d -> d.hasEditorial()).count()).isEqualTo(8);
    }

    @Test
    void theFakeCoachFailsOnlyOnTheOutageMarker() {
        var coach = new E2eCoach();
        assertThat(coach.generateJson("any problem")).contains("\"estimatedRating\":1300");
        assertThat(catchThrowable(() -> coach.generateJson("x AI-OUTAGE y"))).hasMessageContaining("outage");
        OcrEngine noOcr = image -> "";
        assertThat(noOcr.recognize(new byte[0])).isEmpty();
    }

    @Test
    void excludesOtherTestSourceClassesButKeepsTheE2ePackage() throws Exception {
        var filter = new TestClassExcludeFilter();
        var factory = new SimpleMetadataReaderFactory();
        assertThat(filter.match(factory.getMetadataReader("com.algolearn.support.TestDoubles"), factory)).isTrue();
        assertThat(filter.match(factory.getMetadataReader(E2eConfig.class.getName()), factory)).isFalse();
        assertThat(filter.match(factory.getMetadataReader("com.algolearn.AlgoLearnApplication"), factory)).isFalse();
        assertThat(filter).isEqualTo(new TestClassExcludeFilter()).hasSameHashCodeAs(new TestClassExcludeFilter());
    }
}
