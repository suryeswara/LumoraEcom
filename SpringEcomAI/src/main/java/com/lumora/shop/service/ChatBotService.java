package com.lumora.shop.service;

import com.lumora.shop.vector.VectorDocs;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.Filter;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ChatBotService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final ResourceLoader resourceLoader;

    public ChatBotService(ChatClient chatClient, VectorStore vectorStore, ResourceLoader resourceLoader) {
        this.chatClient = chatClient;
        this.vectorStore = vectorStore;
        this.resourceLoader = resourceLoader;
    }

    /** RAG answer scoped to what this user may see: all products + only THEIR OWN orders. */
    public String getBotResponse(String userQuery, String userEmail) {
        try {
            String promptTemplate = resourceLoader
                    .getResource("classpath:prompts/chatbot-rag-prompt.st")
                    .getContentAsString(StandardCharsets.UTF_8);

            String context = fetchSemanticContext(userQuery, userEmail);

            Map<String, Object> variables = new HashMap<>();
            variables.put("userQuery", userQuery);
            variables.put("context", context);

            PromptTemplate prompt = PromptTemplate.builder()
                    .template(promptTemplate)
                    .variables(variables)
                    .build();

            return chatClient.prompt(prompt.create()).call().content();

        } catch (IOException e) {
            return "Sorry, the assistant is temporarily unavailable.";
        }
    }

    /**
     * Data isolation happens in the vector query itself (metadata filter), BEFORE anything reaches the LLM:
     * (type == product) OR (type == order AND ownerEmail == caller). Another customer's order can never be
     * retrieved, so it can never be revealed, whatever the user types (prompt injection included).
     */
    private String fetchSemanticContext(String query, String userEmail) {
        FilterExpressionBuilder b = new FilterExpressionBuilder();
        Filter.Expression visible = b.or(
                b.eq(VectorDocs.TYPE, VectorDocs.TYPE_PRODUCT),
                b.and(b.eq(VectorDocs.TYPE, VectorDocs.TYPE_ORDER),
                      b.eq(VectorDocs.OWNER_EMAIL, userEmail))
        ).build();

        List<Document> documents = vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(query)
                        .topK(5)
                        .filterExpression(visible)
                        .build());

        StringBuilder contextBuilder = new StringBuilder();
        for (Document doc : documents) {
            contextBuilder.append(doc.getFormattedContent()).append("\n");
        }
        return contextBuilder.toString();
    }
}
