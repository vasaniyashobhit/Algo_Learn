package com.algolearn.config.env;

import static org.assertj.core.api.Assertions.assertThat;

import com.algolearn.support.TestProperties;
import org.junit.jupiter.api.Test;

class EnvValidatorTest {

    @Test
    void parsesAValidEnvAppliesDefaultsAndCoercesTypes() {
        var env = TestProperties.env();
        env.put("PORT", "5000");
        var props = EnvValidator.parse(env::get, false);
        assertThat(props.port()).isEqualTo(5000);
        assertThat(props.geminiModels()).containsExactly("gemini-a", "gemini-b");
        assertThat(props.syncCron()).isEqualTo("0 */6 * * *");
        assertThat(props.logLevel()).isEqualTo("info");
        assertThat(props.production()).isFalse();
    }

    @Test
    void appliesDefaultsWhenVarsWithDefaultsAreAbsentAndFlagsProduction() {
        var env = TestProperties.env();
        env.remove("PORT");
        env.remove("CLIENT_URL");
        env.remove("JWT_EXPIRES_IN");
        var props = EnvValidator.parse(env::get, true);
        assertThat(props.port()).isEqualTo(4000);
        assertThat(props.clientUrl()).isEqualTo("http://localhost:5173");
        assertThat(props.jwtExpiresIn()).isEqualTo("7d");
        assertThat(props.production()).isTrue();
    }

    @Test
    void treatsEmptyOptionalGroqVarsAsUnset() {
        var env = TestProperties.env();
        env.put("GROQ_API_KEY", "");
        env.put("GROQ_MODEL", " ");
        var props = EnvValidator.parse(env::get, false);
        assertThat(props.groqApiKey()).isEmpty();
        assertThat(props.groqModel()).isEmpty();
        env.put("GROQ_MODEL", "openai/gpt-oss-120b");
        assertThat(EnvValidator.parse(env::get, false).groqModel()).contains("openai/gpt-oss-120b");
    }

    @Test
    void dropsATrailingSlashFromClientUrlSoCorsMatchesTheOriginHeader() {
        var env = TestProperties.env();
        env.put("CLIENT_URL", "https://algolearn.vercel.app/");
        assertThat(EnvValidator.parse(env::get, false).clientUrl()).isEqualTo("https://algolearn.vercel.app");
        env.put("CLIENT_URL", "https://algolearn.vercel.app");
        assertThat(EnvValidator.parse(env::get, false).clientUrl()).isEqualTo("https://algolearn.vercel.app");
    }
}
