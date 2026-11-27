package com.lumora.shop;

import org.junit.jupiter.api.Test;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/** Smoke test: the whole application context starts against a real PostgreSQL+pgvector container (skipped without Docker). */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class SpringEcomAiApplicationTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(
            DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres"));

    @MockitoBean
    VectorStore vectorStore;   // avoid real embedding calls to OpenAI

    @Test
    void contextLoads() {
    }
}
