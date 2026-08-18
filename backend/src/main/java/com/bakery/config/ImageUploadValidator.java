package com.bakery.config;

import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.IOException;

/** The declared Content-Type on a multipart part is client-supplied and trivially spoofed —
 *  actually decoding the bytes as an image is what stops non-image files from being saved
 *  under an image extension and served back out from /uploads/**. Shared by every upload
 *  path (product images, GCash receipts) so they all get the same real check. */
public final class ImageUploadValidator {

    private ImageUploadValidator() {
    }

    public static boolean isGenuineImage(MultipartFile file) {
        try (var imageStream = file.getInputStream()) {
            return ImageIO.read(imageStream) != null;
        } catch (IOException e) {
            return false;
        }
    }
}
