# AlgoLearn backend image. Build from backend/:  docker build -t algolearn-backend .
# Stage 1 builds the jar with the Maven wrapper (tests run in CI, not here); stage 2 runs it on a JRE with
# Tesseract OCR and its English data (the stuck flow's image fallback after Gemini).

FROM eclipse-temurin:21-jdk-noble AS build
WORKDIR /src
COPY .mvn/ .mvn/
COPY mvnw pom.xml lombok.config ./
COPY build/ build/
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline
COPY config/ config/
COPY src/ src/
RUN ./mvnw -q -B -DskipTests package && cp target/algolearn-backend-*.jar /app.jar

FROM eclipse-temurin:21-jre-noble
# tesseract-ocr pulls libtesseract5 + leptonica; Tess4J loads libtesseract through JNA, so give it the unversioned
# name (the -dev package would add it, with far more than we need).
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng \
    && ln -sf "$(find /usr/lib -name 'libtesseract.so.5*' | head -n 1)" /usr/lib/libtesseract.so \
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
