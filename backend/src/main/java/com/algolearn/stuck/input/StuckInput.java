package com.algolearn.stuck.input;

/** A validated POST /stuck request: the input type plus the optional text, link and uploaded file. */
public record StuckInput(String inputType, String text, String url, UploadedFile file) {
}
