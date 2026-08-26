import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

/// Bebas Neue for headings, DM Sans for body — same pairing as shared.css.
class AppText {
  AppText._();

  static TextStyle heading({double size = 24, Color color = AppColors.text, double letterSpacing = 2}) {
    return GoogleFonts.bebasNeue(fontSize: size, color: color, letterSpacing: letterSpacing);
  }

  static TextStyle body({
    double size = 14,
    Color color = AppColors.text,
    FontWeight weight = FontWeight.w400,
  }) {
    return GoogleFonts.dmSans(fontSize: size, color: color, fontWeight: weight);
  }
}
