package com.bakery.catalog;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public List<ProductDto> getProducts(Long categoryId, String search) {
        List<Product> products;
        boolean hasCategory = categoryId != null;
        boolean hasSearch = search != null && !search.isBlank();

        if (hasCategory && hasSearch) {
            products = productRepository.findByCategoryIdAndNameContainingIgnoreCase(categoryId, search);
        } else if (hasCategory) {
            products = productRepository.findByCategoryId(categoryId);
        } else if (hasSearch) {
            products = productRepository.findByNameContainingIgnoreCase(search);
        } else {
            products = productRepository.findAll();
        }

        return products.stream().map(ProductDto::from).toList();
    }

    public Optional<ProductDto> getProductById(Long id) {
        return productRepository.findById(id).map(ProductDto::from);
    }

    public List<CategoryDto> getCategories() {
        return categoryRepository.findAll().stream().map(CategoryDto::from).toList();
    }

    @Transactional
    public ProductDto createProduct(ProductRequestDTO request) {
        Category category = findCategoryOrThrow(request.categoryId());
        Product product = Product.builder()
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .category(category)
                .image(request.image())
                .badgesCsv(request.badges() == null ? null : String.join(",", request.badges()))
                .rating(0)
                .available(request.available())
                .customizations(toCustomizations(request.customizationKeys(), request.customizationPrices()))
                .build();
        return ProductDto.from(productRepository.save(product));
    }

    @Transactional
    public ProductDto updateProduct(Long id, ProductRequestDTO request) {
        Product product = findProductOrThrow(id);
        Category category = findCategoryOrThrow(request.categoryId());

        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setCategory(category);
        product.setImage(request.image());
        product.setBadgesCsv(request.badges() == null ? null : String.join(",", request.badges()));
        product.setAvailable(request.available());
        product.setCustomizations(toCustomizations(request.customizationKeys(), request.customizationPrices()));

        return ProductDto.from(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = findProductOrThrow(id);
        productRepository.delete(product);
    }

    @Transactional
    public ProductDto setAvailability(Long id, boolean available) {
        Product product = findProductOrThrow(id);
        product.setAvailable(available);
        return ProductDto.from(productRepository.save(product));
    }

    private Product findProductOrThrow(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product " + id + " not found"));
    }

    private Category findCategoryOrThrow(Long categoryId) {
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category " + categoryId + " does not exist"));
    }

    /** Preset option names per key — fixed and shared across all products. Only each option's
     *  price (customizationPrices, per-product) varies; a missing price defaults to no surcharge. */
    private static final Map<String, List<String>> PRESET_OPTION_NAMES = Map.of(
            "MILK", List.of("Whole", "Oat", "Almond", "Skim"),
            "SUGAR", List.of("None", "Light", "Regular", "Extra"),
            "TEMP", List.of("Warmed", "Room Temp"),
            "ICE", List.of("No Ice", "Standard Ice", "Extra Chill"));

    private List<Customization> toCustomizations(List<String> keys, Map<String, Map<String, BigDecimal>> customizationPrices) {
        List<Customization> customizations = new ArrayList<>();
        if (keys == null) return customizations;
        Map<String, Map<String, BigDecimal>> prices = customizationPrices == null ? Map.of() : customizationPrices;
        for (String key : keys) {
            String name = switch (key) {
                case "MILK" -> "Milk";
                case "SUGAR" -> "Sugar Level";
                case "TEMP" -> "Temperature";
                case "ICE" -> "Ice Level";
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown customization key: " + key);
            };
            boolean required = key.equals("MILK") || key.equals("SUGAR") || key.equals("ICE");
            Map<String, BigDecimal> keyPrices = prices.getOrDefault(key, Map.of());
            List<CustomizationOptionCodec.PricedOption> options = PRESET_OPTION_NAMES.get(key).stream()
                    .map(optionName -> new CustomizationOptionCodec.PricedOption(
                            optionName, keyPrices.getOrDefault(optionName, BigDecimal.ZERO)))
                    .toList();
            customizations.add(Customization.builder()
                    .name(name).optionsCsv(CustomizationOptionCodec.encode(options)).required(required).build());
        }
        return customizations;
    }
}
