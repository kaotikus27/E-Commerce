package com.bakery.catalog;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Admin-only image upload for product photos, stored under an external "uploads/" dir. */
@RestController
@RequestMapping("/api/v1/admin/uploads")
public class AdminUploadController {

    private static final Path UPLOAD_DIR = Path.of("uploads");
    private static final Map<String, String> ALLOWED_CONTENT_TYPES = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp"
    );

    @PostMapping("/image")
    public UploadResponseDto uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }

        String extension = ALLOWED_CONTENT_TYPES.get(file.getContentType());
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported image type. Allowed: " + List.copyOf(ALLOWED_CONTENT_TYPES.keySet()));
        }

        String filename = UUID.randomUUID() + "." + extension;

        try {
            Files.createDirectories(UPLOAD_DIR);
            file.transferTo(UPLOAD_DIR.resolve(filename));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store image", e);
        }

        return new UploadResponseDto("/uploads/" + filename);
    }
}
