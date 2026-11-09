package com.algolearn.security;

import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.BeanFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.util.matcher.NegatedRequestMatcher;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * Stateless JWT security, deny by default: only the public list below is open. Prefixes that the
 * legacy API guarded as a whole (router.use(requireAuth)) need a token for every path under them.
 * Any other path that no controller handles is let through so it answers 404 ROUTE_NOT_FOUND.
 * CORS and security headers are servlet filters before this chain. Skipped for --task runs.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication
public class SecurityConfig {

    static final String[] PROTECTED_PREFIXES = {"/api/v1/users/**", "/api/v1/recommendations/**",
        "/api/v1/practice/**", "/api/v1/stuck/**"};

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http, JsonAuthEntryPoint entryPoint,
            JsonAccessDeniedHandler deniedHandler, JwtService jwt, BeanFactory beans) {
        var knownRoutes = new KnownRoutes(() -> beans.getBean("requestMappingHandlerMapping",
                RequestMappingHandlerMapping.class));
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
                .addFilterBefore(new JwtAuthFilter(jwt), AuthorizationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/health", "/api/v1/health/ready",
                                "/api/v1/meta/tags").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/signup", "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/problems", "/api/v1/problems/*/*",
                                "/api/v1/problems/*/*/similar").permitAll()
                        // Guarded by its own cron secret header instead of a user token.
                        .requestMatchers(HttpMethod.POST, "/api/v1/internal/sync-all").permitAll()
                        .requestMatchers(PROTECTED_PREFIXES).authenticated()
                        .requestMatchers(new NegatedRequestMatcher(knownRoutes)).permitAll()
                        .anyRequest().authenticated())
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
