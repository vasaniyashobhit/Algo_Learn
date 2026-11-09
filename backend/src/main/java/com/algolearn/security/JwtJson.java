package com.algolearn.security;

import io.jsonwebtoken.io.AbstractDeserializer;
import io.jsonwebtoken.io.AbstractSerializer;
import java.io.OutputStream;
import java.io.Reader;
import java.util.Map;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** jjwt JSON support on the application's Jackson 3 mapper (jjwt-jackson only supports Jackson 2). */
final class JwtJson {

    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {
    };

    private JwtJson() {
    }

    static AbstractSerializer<Map<String, ?>> serializer(JsonMapper json) {
        return new AbstractSerializer<>() {
            @Override
            protected void doSerialize(Map<String, ?> value, OutputStream out) {
                json.writeValue(out, value);
            }
        };
    }

    static AbstractDeserializer<Map<String, ?>> deserializer(JsonMapper json) {
        return new AbstractDeserializer<>() {
            @Override
            protected Map<String, ?> doDeserialize(Reader reader) {
                return json.readValue(reader, MAP);
            }
        };
    }
}
