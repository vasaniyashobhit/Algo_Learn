package com.algolearn.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Stateless API security. CORS and security headers are servlet filters that run before this
 * chain (so preflights and errors get them too). Health and meta are public; protected feature
 * routes are added here in later sessions. Every other path stays open so that unknown routes
 * answer 404 ROUTE_NOT_FOUND like the legacy API, not 401.
 */
@Configuration(proxyBeanMethods = false)
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http, JsonAuthEntryPoint entryPoint,
            JsonAccessDeniedHandler deniedHandler) {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(AbstractHttpConfigurer::disable)
                .headers(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .anonymous(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e.authenticationEntryPoint(entryPoint).accessDeniedHandler(deniedHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/v1/health", "/api/v1/health/ready").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/meta/**").permitAll()
                        .anyRequest().permitAll())
                .build();
    }

    /** No form/basic login exists; this stops Spring Boot from generating a default user. */
    @Bean
    UserDetailsService noUsers() {
        return username -> {
            throw new UsernameNotFoundException("Users authenticate with JWT only");
        };
    }
}
