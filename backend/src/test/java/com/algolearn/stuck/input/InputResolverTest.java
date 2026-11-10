package com.algolearn.stuck.input;

import static com.algolearn.stuck.StuckFixtures.PNG;
import static com.algolearn.stuck.StuckFixtures.STATEMENT;
import static com.algolearn.stuck.StuckFixtures.makePdf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.algolearn.common.error.AppException;
import com.algolearn.common.error.ErrorCode;
import com.algolearn.common.error.FieldIssue;
import com.algolearn.stuck.url.FromUrl;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Legacy resolveInput.test.js: dispatch per input type, required fields, file checks. */
class InputResolverTest {

    private static final String URL = "https://codeforces.com/contest/1/problem/A";

    private final FromUrl fromUrl = mock(FromUrl.class);
    private final FromPdf fromPdf = mock(FromPdf.class);
    private final FromImage fromImage = mock(FromImage.class);
    private final InputResolver resolver = new InputResolver(fromUrl, fromPdf, fromImage);

    private static StuckInput input(String type, String text, String url, UploadedFile file) {
        return new StuckInput(type, text, url, file);
    }

    @Test
    void dispatchesEachInputTypeAndRecordsTheRawInput() {
        when(fromUrl.read(URL)).thenReturn(new FromUrl.Result("1/A", null));
        when(fromPdf.read(any())).thenReturn("pdf text");
        when(fromImage.read(any(), any(), any())).thenReturn(new FromImage.Read("image text", "ocr"));
        assertThat(resolver.resolve(input("text", STATEMENT, null, null), null))
                .isEqualTo(new ResolvedInput(STATEMENT, null, STATEMENT, null));
        assertThat(resolver.resolve(input("url", null, URL, null), null))
                .isEqualTo(new ResolvedInput(null, "1/A", URL, null));
        var pdf = makePdf();
        assertThat(resolver.resolve(input("pdf", null, null, new UploadedFile("application/pdf", pdf)), null))
                .isEqualTo(new ResolvedInput("pdf text", null, "pdf text", null));
        verify(fromPdf).read(pdf);
        var deadline = Instant.ofEpochMilli(9);
        assertThat(resolver.resolve(input("image", null, null, new UploadedFile("image/png", PNG)), deadline))
                .isEqualTo(new ResolvedInput("image text", null, "image text", "ocr"));
        verify(fromImage).read(eq(PNG), eq("image/png"), eq(deadline));
    }

    @Test
    void readsATxtUploadForTheTextType() {
        var file = new UploadedFile("text/plain", STATEMENT.getBytes(StandardCharsets.UTF_8));
        assertThat(resolver.resolve(input("text", null, null, file), null).text()).isEqualTo(STATEMENT);
    }

    @Test
    void requiresTheFieldThatMatchesTheInputType() {
        expectMissing(input("text", null, null, null), "body.text", "Paste the problem statement");
        expectMissing(input("url", null, null, null), "body.url", "Paste a link to the problem");
        expectMissing(input("url", null, "", null), "body.url", "Paste a link to the problem");
        expectMissing(input("pdf", null, null, null), "file", "Upload a PDF file");
        expectMissing(input("image", null, null, null), "file", "Upload a image file");
    }

    @Test
    void rejectsAFileOfTheWrongTypeForTheInputType() {
        expectUnsupported(input("pdf", null, null, new UploadedFile("image/png", PNG)));
        expectUnsupported(input("image", null, null, new UploadedFile("application/pdf", makePdf())));
    }

    @Test
    void rejectsASpoofedMimeTypeAndKeepsAValidFile() {
        var spoofed = catchThrowableOfType(AppException.class, () -> InputResolver.checkFile(
                new UploadedFile("image/png", "<html>".getBytes(StandardCharsets.UTF_8)), "image"));
        assertThat(spoofed.details()).isEqualTo(List.of(new FieldIssue("file",
                "Allowed for image: image/png, image/jpeg, image/webp")));
        expectUnsupported(input("text", null, null, new UploadedFile("text/plain", new byte[] {0x41, 0, 0x42})));
        var png = new UploadedFile("image/png", PNG);
        assertThat(InputResolver.checkFile(png, "image")).isSameAs(png);
    }

    private void expectMissing(StuckInput request, String field, String message) {
        var error = catchThrowableOfType(AppException.class, () -> resolver.resolve(request, null));
        assertThat(error.code()).isEqualTo(ErrorCode.VALIDATION_FAILED);
        assertThat(error.details()).isEqualTo(List.of(new FieldIssue(field, message)));
    }

    private void expectUnsupported(StuckInput request) {
        var error = catchThrowableOfType(AppException.class, () -> resolver.resolve(request, null));
        assertThat(error.status().value()).isEqualTo(415);
        assertThat(error.code()).isEqualTo(ErrorCode.FILE_TYPE_UNSUPPORTED);
    }
}
