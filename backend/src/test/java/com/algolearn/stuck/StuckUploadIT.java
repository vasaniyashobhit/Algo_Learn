package com.algolearn.stuck;

import static com.algolearn.stuck.StuckFixtures.JPEG;
import static com.algolearn.stuck.StuckFixtures.PNG;
import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static com.algolearn.stuck.StuckFixtures.makePdf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import com.algolearn.llm.ImageText;
import com.algolearn.problems.ProblemRepository;
import com.algolearn.stuck.url.UrlFakes;
import com.algolearn.support.Json;
import com.algolearn.support.StuckDoubles;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockPart;
import org.springframework.test.web.servlet.MockMvc;

/** Legacy stuck.upload.routes.test.js: PDF, screenshots (Gemini, then OCR), .txt, types and sizes. */
class StuckUploadIT extends StuckIT {

    StuckUploadIT(MockMvc mvc, JdbcTemplate jdbc, StuckDoubles.FakeAi ai, StuckDoubles.FakeOcr ocr,
            UrlFakes.Hosts hosts, UrlFakes.Pages pages, ProblemRepository problems) {
        super(mvc, jdbc, ai, ocr, hosts, pages, problems);
    }

    @Test
    void readsAPdfWithPdfBox() throws Exception {
        var res = upload(user(), "pdf", makePdf("Count the paths in a tree with n vertices"), "application/pdf");
        assertThat(res.getResponse().getStatus()).isEqualTo(201);
        assertThat(data(res).get("inputType").asString()).isEqualTo("pdf");
        assertThat(ai.coachCalls.getFirst().text()).isEqualTo("Count the paths in a tree with n vertices");
    }

    @Test
    void readsAScreenshotWithGeminiOrWithOcrWhenGeminiReturnsNothing() throws Exception {
        ai.image = new ImageText(STATEMENT, "gemini", "a");
        var token = user();
        assertThat(upload(token, "image", PNG, "image/png").getResponse().getStatus()).isEqualTo(201);
        assertThat(ocr.calls).isZero();
        ai.image = null;
        ocr.text = STATEMENT;
        assertThat(upload(token, "image", JPEG, "image/jpeg").getResponse().getStatus()).isEqualTo(201);
        assertThat(ocr.calls).isEqualTo(1);
    }

    @Test
    void acceptsATxtFileForTheTextType() throws Exception {
        var res = upload(user(), "text", STATEMENT.getBytes(StandardCharsets.UTF_8), "text/plain");
        assertThat(res.getResponse().getStatus()).isEqualTo(201);
    }

    @Test
    void answersInputUnreadableWhenNeitherGeminiNorOcrFindsText() throws Exception {
        var error = error(upload(user(), "image", PNG, "image/png"), 422, "INPUT_UNREADABLE");
        assertThat(error.get("details")).isEqualTo(Json.parse("{\"inputType\":\"image\"}"));
    }

    @Test
    void answers415ForARefusedTypeASpoofedFileAndAFileForTheWrongInputType() throws Exception {
        var token = user();
        error(upload(token, "image", PNG, "image/gif"), 415, "FILE_TYPE_UNSUPPORTED");
        error(upload(token, "pdf", "<html>hi</html>".getBytes(StandardCharsets.UTF_8), "application/pdf"), 415,
                "FILE_TYPE_UNSUPPORTED");
        error(upload(token, "pdf", PNG, "image/png"), 415, "FILE_TYPE_UNSUPPORTED");
    }

    @Test
    void answers413Above5Mb() throws Exception {
        error(upload(user(), "image", new byte[5 * 1024 * 1024 + 10], "image/png"), 413, "FILE_TOO_LARGE");
    }

    @Test
    void requiresAFileForPdfAndImage() throws Exception {
        var field = new MockPart("inputType", "pdf".getBytes(StandardCharsets.UTF_8));
        var res = mvc.perform(multipart(PATH).part(field).header(HttpHeaders.AUTHORIZATION, "Bearer " + user()))
                .andReturn();
        assertThat(Json.issues(error(res, 400, "VALIDATION_FAILED"))).containsExactly("file: Upload a PDF file");
    }
}
