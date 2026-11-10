package com.algolearn.stuck;

import com.algolearn.llm.Llm;
import com.algolearn.llm.chain.ExecutorTimeLimiter;
import com.algolearn.problems.similar.SimilarSearch;
import com.algolearn.stuck.input.FromImage;
import com.algolearn.stuck.input.FromPdf;
import com.algolearn.stuck.input.InputResolver;
import com.algolearn.stuck.input.Ocr;
import com.algolearn.stuck.input.OcrEngine;
import com.algolearn.stuck.input.PdfText;
import com.algolearn.stuck.input.TesseractEngine;
import com.algolearn.stuck.result.EasierSimilar;
import com.algolearn.stuck.url.FetchLimits;
import com.algolearn.stuck.url.FromUrl;
import com.algolearn.stuck.url.HostResolver;
import com.algolearn.stuck.url.PageFetcher;
import com.algolearn.stuck.url.SafePageFetcher;
import com.algolearn.stuck.url.UrlGuard;
import java.time.Clock;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Wires the stuck flow (legacy stuck.module). DNS, fetch, OCR and the LLM are beans so tests can replace them. */
@Configuration(proxyBeanMethods = false)
public class StuckConfig {

    @Bean
    StuckAi stuckAi(Llm llm) {
        return StuckAi.of(llm);
    }

    @Bean
    HostResolver hostResolver() {
        return HostResolver.SYSTEM;
    }

    @Bean
    PageFetcher pageFetcher(Clock clock) {
        return new SafePageFetcher(clock);
    }

    @Bean
    OcrEngine ocrEngine(@Value("${TESSDATA_PREFIX:}") String tessdataPrefix) {
        return new TesseractEngine(Optional.of(tessdataPrefix).filter(prefix -> !prefix.isBlank()));
    }

    /** OCR owns its time limiter (closed with the bean), separate from the LLM chain's. */
    @Bean(destroyMethod = "close")
    Ocr ocr(OcrEngine ocrEngine) {
        return new Ocr(ocrEngine, ExecutorTimeLimiter.virtualThreads());
    }

    @Bean
    InputResolver stuckInputResolver(HostResolver hostResolver, PageFetcher pageFetcher, Ocr ocr,
            StuckAi stuckAi, Clock clock) {
        var fromUrl = new FromUrl(new UrlGuard(hostResolver), pageFetcher, clock, FetchLimits.DEFAULT);
        var fromImage = new FromImage(stuckAi::readImage, ocr, clock);
        return new InputResolver(fromUrl, new FromPdf(PdfText.PDFBOX), fromImage);
    }

    @Bean
    StuckService stuckService(InputResolver stuckInputResolver, StuckAi stuckAi, SimilarSearch similarSearch,
            StuckRepository stuckRepository, StuckQueryStore stuckQueryStore, Clock clock) {
        return new StuckService(stuckInputResolver, stuckAi::coach, new EasierSimilar(similarSearch),
                stuckRepository, stuckQueryStore, clock);
    }
}
