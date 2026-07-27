package com.bakery.faq;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds the starter FAQ list (migrated from the old hardcoded FAQ page copy) on boot. */
@Component
@RequiredArgsConstructor
public class FaqSeeder implements CommandLineRunner {

    private final FaqRepository faqRepository;

    @Override
    public void run(String... args) {
        if (faqRepository.count() > 0) return;

        faqRepository.save(Faq.builder()
                .question("How far ahead can I order?")
                .answer("Order any time during business hours for pickup as soon as 15 minutes later.")
                .active(true).sortOrder(0).build());

        faqRepository.save(Faq.builder()
                .question("Do you offer delivery?")
                .answer("Not yet — we're pickup-only for now to keep everything as fresh as possible.")
                .active(true).sortOrder(1).build());

        faqRepository.save(Faq.builder()
                .question("Can I customize my drink?")
                .answer("Yes! Milk type, sugar level, and temperature can all be adjusted when adding an item to your cart.")
                .active(true).sortOrder(2).build());

        faqRepository.save(Faq.builder()
                .question("What if an item is unavailable?")
                .answer("We'll call the phone number on your order to arrange a substitution or refund.")
                .active(true).sortOrder(3).build());
    }
}
