package com.bakery.catalog;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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
}
