package com.lumora.shop.service;

import com.lumora.shop.model.Product;
import com.lumora.shop.repo.ProductRepo;
import com.lumora.shop.vector.VectorDeleteEvent;
import com.lumora.shop.vector.VectorDocs;
import com.lumora.shop.vector.VectorUpsertEvent;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class ProductService {

    @Autowired
    private ProductRepo productRepo;

    @Autowired
    private ChatClient chatClient;

    @Autowired
    private VectorStore vectorStore;

    @Autowired
    private ResourceLoader resourceLoader;

    @Autowired
    private AIImageGeneratorService aiImageGeneratorService;

    @Autowired
    private ApplicationEventPublisher events;

    public List<Product> getAllProducts() {
        return productRepo.findAll();
    }

    public Product getProductById(int id) {
        return productRepo.findById(id).orElse(new Product(-1));
    }

    /**
     * Creates or updates a product. The vector index is refreshed AFTER the DB commit (see VectorIndexListener);
     * the previous embedding of this product is replaced, so edits never leave stale vectors behind.
     */
    @Transactional
    public Product addOrUpdateProduct(Product product, MultipartFile image) throws IOException {

        if (image != null && !image.isEmpty()) {
            product.setImageName(image.getOriginalFilename());
            product.setImageType(image.getContentType());
            product.setProductImage(image.getBytes());
        } else if (product.getId() > 0) {
            // Update without a new image: keep the one already stored instead of overwriting it with null
            productRepo.findById(product.getId()).ifPresent(existing -> {
                product.setImageName(existing.getImageName());
                product.setImageType(existing.getImageType());
                product.setProductImage(existing.getProductImage());
            });
        }

        Product savedProduct = productRepo.save(product);

        events.publishEvent(new VectorUpsertEvent(
                VectorDocs.productFilter(savedProduct.getId()),
                VectorDocs.productContent(savedProduct),
                VectorDocs.productMetadata(savedProduct.getId())));

        return savedProduct;
    }

    public String generateDescription(String name,String category){
        String descPrompt = String.format("""
            Write a concise and professional product description for an e-commerce listing.

            Product Name: %s
            Category: %s

            Keep it simple, engaging, and highlight its primary features or benefits.
            Avoid technical jargon and keep it customer-friendly.
            Limit the description to 250 characters maximum.
            """, name, category);

        // Call AI chat model to generate product description
        return Objects.requireNonNull(chatClient.prompt(descPrompt)
                        .call()
                        .chatResponse())
                .getResult()
                .getOutput()
                .getText();

    }

    public byte[] generateImage(String name,String category,String description) {
        String imagePrompt = String.format("""
                        Generate a highly realistic, professional-grade e-commerce product image.

                        Product Details:
                        - Category: %s
                        - Name: '%s'
                        - Description: %s

                        Requirements:
                          - Use a clean, minimalistic, white or very light grey background.
                          - Ensure the product is well-lit with soft, natural-looking lighting.
                          - Add realistic shadows and soft reflections to ground the product naturally.
                          - No humans, brand logos, watermarks, or text overlays should be visible.
                          - Showcase the product from its most flattering angle that highlights key features.
                          - Ensure the product occupies a prominent position in the frame, centered or slightly off-centered.
                          - Maintain a high resolution and sharpness, ensuring all textures, colors, and details are clear.
                          - Follow the typical visual style of top e-commerce websites like Amazon, Flipkart, or Shopify.
                          - Make the product appear life-like and professionally photographed in a studio setup.
                          - The final image should look immediately ready for use on an e-commerce website without further editing.
                        """, category, name, description);

        // Call AI image model to generate product image
        byte[] aiImage = aiImageGeneratorService.generateImage(imagePrompt);

        return aiImage;
    }

    /** Fails with a 409 (see GlobalExceptionHandler) if the product is part of an order; the index entry is removed only on success. */
    @Transactional
    public void deleteProduct(int id) {
        productRepo.deleteById(id);
        events.publishEvent(new VectorDeleteEvent(VectorDocs.productFilter(id)));
    }

    public List<Product> semanticSearchProducts(String userQuery) {
        try {
            // Load prompt template from classpath resource
            // getContentAsString works inside a packaged JAR (Resource#getFile does not)
            String promptTemplate = resourceLoader
                    .getResource("classpath:prompts/product-search-prompt.st")
                    .getContentAsString(StandardCharsets.UTF_8);

            // Fetch related context from vector store using semantic similarity
            String context = fetchSemanticContext(userQuery);

            // Fill variables into the prompt template
            Map<String, Object> variables = new HashMap<>();
            variables.put("userQuery", userQuery);
            variables.put("context", context);

            // Create the full prompt using the template and variables
            PromptTemplate template = PromptTemplate.builder()
                    .template(promptTemplate)
                    .variables(variables)
                    .build();

            Prompt prompt = new Prompt(template.createMessage());

            // Call the AI model to get generated product results
            Generation generation = chatClient.prompt(prompt)
                    .call()
                    .chatResponse()
                    .getResult();

            // Convert the AI's textual output into a list of Product objects
            BeanOutputConverter<List<Product>> outputConverter = new BeanOutputConverter<>(
                    new ParameterizedTypeReference<>() {}
            );
            List<Product> aiProducts = outputConverter.convert(generation.getOutput().getText());

            // Extract valid product IDs (>0) from AI result
            List<Integer> productIds = aiProducts.stream()
                    .map(Product::getId)
                    .filter(id -> id > 0)
                    .toList();

            // Query and return actual product entities from DB using the IDs
            return productRepo.findAllById(productIds);

        } catch (IOException e) {
            // Handle template loading or processing errors
            throw new RuntimeException("Failed to process query", e);
        }
    }

    // Fetch top 5 semantically similar documents using vector store
    private String fetchSemanticContext(String query) {
        // Product search must only see product documents (never order summaries, which hold customer data)
        FilterExpressionBuilder b = new FilterExpressionBuilder();
        List<Document> documents = vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(query)
                        .topK(5)                       // Number of similar documents to retrieve
                        .filterExpression(b.eq(VectorDocs.TYPE, VectorDocs.TYPE_PRODUCT).build())
//                        .similarityThreshold(0.7f)     // Minimum similarity required
                        .build()
        );

        // Combine contents of retrieved documents into a single context string
        StringBuilder contextBuilder = new StringBuilder();
        for (Document doc : documents) {
            contextBuilder.append(doc.getFormattedContent()).append("\n");
        }

        return contextBuilder.toString();
    }

}
