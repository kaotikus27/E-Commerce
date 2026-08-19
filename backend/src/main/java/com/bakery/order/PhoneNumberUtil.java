package com.bakery.order;

import java.util.regex.Pattern;

/** Shared PH phone-number normalization, originally built for the Lalamove dispatch call
 *  (which requires strict E.164) and reused here so a customer looking up their order can type
 *  their phone in any common shape and still match what's stored. */
public final class PhoneNumberUtil {

    /** A normalized PH mobile number in E.164 shape: +63 followed by a 9-prefixed 10-digit
     *  mobile number (e.g. "+639605168262"). */
    private static final Pattern PH_MOBILE_E164 = Pattern.compile("^\\+639\\d{9}$");

    private PhoneNumberUtil() {
    }

    /** Converts common PH mobile input shapes ("09605168262", "9605168262", "639605168262",
     *  with optional spaces/dashes) to E.164 ("+639605168262"). Returns null if the result isn't
     *  a plausible PH mobile number. */
    public static String toE164Philippines(String phone) {
        if (phone == null || phone.isBlank()) return null;

        String digits = phone.trim().replaceAll("[^0-9+]", "");
        String candidate;
        if (digits.startsWith("+63")) {
            candidate = digits;
        } else if (digits.startsWith("63")) {
            candidate = "+" + digits;
        } else if (digits.startsWith("0")) {
            candidate = "+63" + digits.substring(1);
        } else {
            candidate = "+63" + digits;
        }

        return PH_MOBILE_E164.matcher(candidate).matches() ? candidate : null;
    }

    /** Fallback comparison for numbers that don't fit the strict PH-mobile E.164 shape (a
     *  landline, or malformed historical data) — strips everything but digits. */
    public static String digitsOnly(String phone) {
        return phone == null ? "" : phone.replaceAll("[^0-9]", "");
    }
}
