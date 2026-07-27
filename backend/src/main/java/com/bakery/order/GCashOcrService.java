package com.bakery.order;

import net.sourceforge.tess4j.Tesseract;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads the GCash transaction reference number off an uploaded receipt screenshot.
 * Tess4J wraps the native Tesseract-OCR engine, which isn't guaranteed to be installed
 * on every machine running this app — every failure path here (missing native lib,
 * missing tessdata, unreadable image, no match) returns null instead of throwing, so a
 * missing OCR install degrades to "admin reads the receipt manually" rather than
 * breaking checkout.
 */
@Service
public class GCashOcrService {

    private static final Pattern GCASH_REF_PATTERN = Pattern.compile("\\b(6\\d{12})\\b");
    private static final Pattern FALLBACK_REF_PATTERN =
            Pattern.compile("(?:Ref|Reference)?\\s*[:.]?\\s*(\\d{10,13})", Pattern.CASE_INSENSITIVE);

    private final Tesseract tesseract;

    public GCashOcrService(@Value("${app.ocr.tessdata-path}") String tessdataPath) {
        this.tesseract = new Tesseract();
        this.tesseract.setDatapath(tessdataPath);
        this.tesseract.setLanguage("eng");
        this.tesseract.setPageSegMode(6);
    }

    public String extractReferenceNumber(InputStream imageStream) {
        try {
            BufferedImage rawImage = ImageIO.read(imageStream);
            if (rawImage == null) return null;

            String rawText = tesseract.doOCR(preprocess(rawImage));

            Matcher matcher = GCASH_REF_PATTERN.matcher(rawText);
            if (matcher.find()) return matcher.group(1);

            Matcher fallbackMatcher = FALLBACK_REF_PATTERN.matcher(rawText);
            if (fallbackMatcher.find()) return fallbackMatcher.group(1);
        } catch (Exception e) {
            // Native Tesseract may not be installed on this machine, or the image may be
            // unreadable/unrecognizable — either way, fall back to manual admin review.
        }
        return null;
    }

    private BufferedImage preprocess(BufferedImage src) {
        int width = src.getWidth() * 2;
        int height = src.getHeight() * 2;

        BufferedImage resized = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = resized.createGraphics();
        g.drawImage(src, 0, 0, width, height, null);
        g.dispose();

        for (int x = 0; x < resized.getWidth(); x++) {
            for (int y = 0; y < resized.getHeight(); y++) {
                int rgb = resized.getRGB(x, y);
                int gray = (rgb >> 16) & 0xFF;
                resized.setRGB(x, y, gray > 140 ? Color.WHITE.getRGB() : Color.BLACK.getRGB());
            }
        }
        return resized;
    }
}
