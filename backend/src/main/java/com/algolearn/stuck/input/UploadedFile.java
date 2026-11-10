package com.algolearn.stuck.input;

/** The one uploaded file (field {@code file}) in memory: its declared mime type and bytes. */
public record UploadedFile(String mimeType, byte[] bytes) {
}
