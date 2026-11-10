# syntax=docker/dockerfile:1.7
# AlgoLearn backend image. Build from backend/:  docker build -t algolearn-backend .
# Stage 1 builds the jar with the Maven wrapper. It is kept lean for small machines: tests are not even compiled
# (CI runs them), Maven gets a capped heap, and ~/.m2 lives in a BuildKit cache mount instead of an image layer.
# Stage 2 runs it on a JRE with Tesseract OCR and its English data (the stuck flow's image fallback after Gemini).

FROM eclipse-temurin:21-jdk-noble AS build
WORKDIR /src
ENV MAVEN_OPTS="-Xmx512m -XX:+UseSerialGC -XX:TieredStopAtLevel=1"
COPY .mvn/ .mvn/
COPY mvnw pom.xml lombok.config ./
COPY build/ build/
COPY config/ config/
COPY src/main/ src/main/
RUN --mount=type=cache,target=/root/.m2 \
    chmod +x mvnw \
    && ./mvnw -q -B -Dmaven.test.skip=true -Djacoco.skip=true -Dcheckstyle.skip=true package \
    && cp target/algolearn-backend-*.jar /app.jar

FROM eclipse-temurin:21-jre-noble
# tesseract-ocr pulls libtesseract5 + libleptonica; Tess4J (and its Lept4J) load both through JNA by their unversioned
# names, so link them (the -dev packages would add the links, with far more than we need). The build fails if a
# library is missing, rather than OCR failing at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng \
    && for pair in tesseract:libtesseract.so.5 leptonica:liblept.so.5; do \
         target="$(find /usr/lib -name "${pair#*:}*" -type f | head -n 1)"; \
         test -n "$target" && ln -sf "$target" "/usr/lib/lib${pair%%:*}.so" || exit 1; \
       done \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 algolearn
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata \
    PORT=4000 \
    SPRING_PROFILES_ACTIVE=prod
# Sized for a 512 MB host: ~256 MB heap, the rest for metaspace, threads and Tesseract's native memory.
ENV JAVA_TOOL_OPTIONS="-Xmx256m -Xss512k -XX:MaxMetaspaceSize=160m -XX:ReservedCodeCacheSize=48m \
-XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError -Djava.awt.headless=true"
WORKDIR /app
COPY --from=build /app.jar app.jar
USER algolearn
EXPOSE 4000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
