package com.algolearn.stuck;

import java.awt.Color;
import java.awt.Font;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import javax.imageio.ImageIO;

/** A generated screenshot: black text lines on white, large enough for OCR (legacy scripts/checks/stuck/png.js). */
public final class TextPng {

    private TextPng() {
    }

    public static byte[] of(List<String> lines) {
        var image = new BufferedImage(1400, 70 * lines.size() + 60, BufferedImage.TYPE_INT_RGB);
        var g = image.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, image.getWidth(), image.getHeight());
        g.setColor(Color.BLACK);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 40));
        for (var i = 0; i < lines.size(); i++) {
            g.drawString(lines.get(i), 30, 70 * (i + 1));
        }
        g.dispose();
        var out = new ByteArrayOutputStream();
        try {
            ImageIO.write(image, "png", out);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }
}
