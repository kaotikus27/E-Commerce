package com.bakery.catalog;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
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
                .customizations(toCustomizations(request.customizationKeys()))
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
        product.setCustomizations(toCustomizations(request.customizationKeys()));

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

    private List<Customization> toCustomizations(List<String> keys) {
        List<Customization> customizations = new ArrayList<>();
        if (keys == null) return customizations;
        for (String key : keys) {
            switch (key) {
                case "MILK" -> customizations.add(Customization.builder()
                        .name("Milk").optionsCsv("Whole,Oat,Almond,Skim").required(true).build());
                case "SUGAR" -> customizations.add(Customization.builder()
                        .name("Sugar Level").optionsCsv("None,Light,Regular,Extra").required(true).build());
                case "TEMP" -> customizations.add(Customization.builder()
                        .name("Temperature").optionsCsv("Warmed,Room Temp").required(false).build());
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown customization key: " + key);
            }
        }
        return customizations;
    }
}
