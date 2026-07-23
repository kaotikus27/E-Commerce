package com.bakery.catalog;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Seeds the in-memory H2 database with the bakery's starter menu on boot. */
@Component
@RequiredArgsConstructor
public class CatalogDataSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Override
    public void run(String... args) {
        if (categoryRepository.count() > 0) return;

        Map<String, Category> categories = Map.of(
                "Espresso", categoryRepository.save(Category.builder().name("Espresso").icon("☕").build()),
                "Cold Brew", categoryRepository.save(Category.builder().name("Cold Brew").icon("🧊").build()),
                "Pastries", categoryRepository.save(Category.builder().name("Pastries").icon("🥐").build()),
                "Fresh Bread", categoryRepository.save(Category.builder().name("Fresh Bread").icon("🍞").build())
        );

        Customization milk = Customization.builder().name("Milk").optionsCsv("Whole,Oat,Almond,Skim").required(true).build();
        Customization sugar = Customization.builder().name("Sugar Level").optionsCsv("None,Light,Regular,Extra").required(true).build();
        Customization temp = Customization.builder().name("Temperature").optionsCsv("Warmed,Room Temp").required(false).build();

        List<Product> seed = List.of(
                Product.builder().name("Butter Croissant").description("Flaky, all-butter croissant baked fresh every morning.")
                        .price(new BigDecimal("4.50")).category(categories.get("Pastries"))
                        .image("https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600")
                        .badgesCsv("Fresh Baked").rating(4.8).available(true).customizations(List.of(temp)).build(),

                Product.builder().name("Sourdough Loaf").description("48-hour fermented sourdough with a crisp crust.")
                        .price(new BigDecimal("7.00")).category(categories.get("Fresh Bread"))
                        .image("https://images.unsplash.com/photo-1585478259715-4d3a5f3a41c3?w=600")
                        .badgesCsv("New").rating(4.9).available(true).build(),

                Product.builder().name("Iced Latte").description("Double espresso over ice with your choice of milk.")
                        .price(new BigDecimal("5.25")).category(categories.get("Cold Brew"))
                        .image("https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600")
                        .badgesCsv("10% OFF").rating(4.7).available(true).customizations(List.of(milk, sugar)).build(),

                Product.builder().name("Matcha Latte").description("Ceremonial-grade matcha whisked with steamed milk.")
                        .price(new BigDecimal("5.75")).category(categories.get("Espresso"))
                        .image("https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600")
                        .rating(4.6).available(true).customizations(List.of(milk, sugar)).build(),

                Product.builder().name("Cappuccino").description("Rich espresso topped with silky steamed milk foam.")
                        .price(new BigDecimal("4.75")).category(categories.get("Espresso"))
                        .image("https://images.unsplash.com/photo-1534778101976-62847782c213?w=600")
                        .rating(4.8).available(true).customizations(List.of(milk)).build(),

                Product.builder().name("Almond Croissant").description("Twice-baked croissant filled with almond cream.")
                        .price(new BigDecimal("5.25")).category(categories.get("Pastries"))
                        .image("https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600")
                        .badgesCsv("Fresh Baked").rating(4.9).available(true).customizations(List.of(temp)).build(),

                Product.builder().name("Cold Brew").description("Slow-steeped 18 hours for a smooth, low-acid cup.")
                        .price(new BigDecimal("4.95")).category(categories.get("Cold Brew"))
                        .image("https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600")
                        .rating(4.7).available(true).customizations(List.of(milk, sugar)).build(),

                Product.builder().name("Whole Wheat Baguette").description("A heartier daily baguette, crisp outside, soft within.")
                        .price(new BigDecimal("6.00")).category(categories.get("Fresh Bread"))
                        .image("https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600")
                        .rating(4.5).available(true).build(),

                Product.builder().name("Cinnamon Roll").description("House-made caramel glaze over a soft cinnamon swirl.")
                        .price(new BigDecimal("4.95")).category(categories.get("Pastries"))
                        .image("https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=600")
                        .badgesCsv("New").rating(4.9).available(true).customizations(List.of(temp)).build(),

                Product.builder().name("Americano").description("Espresso shots topped with hot water for a clean finish.")
                        .price(new BigDecimal("3.95")).category(categories.get("Espresso"))
                        .image("https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=600")
                        .rating(4.6).available(true).customizations(List.of(sugar)).build()
        );

        productRepository.saveAll(seed);
    }
}
