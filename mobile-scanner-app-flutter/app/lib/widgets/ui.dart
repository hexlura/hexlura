import 'package:flutter/material.dart';
import '../theme/colors.dart';
import '../theme/text_styles.dart';

/// Mirrors mobile-scanner-app/app/src/components/ui.tsx — Header / IconButton /
/// Button / Input, same visual language as the RN build and the HTML mockups.

class AppHeader extends StatelessWidget {
  final List<Widget> children;
  const AppHeader({super.key, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(bottom: BorderSide(color: AppColors.border)),
      ),
      child: Row(children: children),
    );
  }
}

class AppIconButton extends StatelessWidget {
  final Widget icon;
  final VoidCallback onPressed;
  final String tooltip;
  const AppIconButton({super.key, required this.icon, required this.onPressed, required this.tooltip});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onPressed,
        child: Container(
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.border),
            borderRadius: BorderRadius.circular(4),
          ),
          child: icon,
        ),
      ),
    );
  }
}

enum AppButtonVariant { primary, secondary }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
  });

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;
    final isSecondary = variant == AppButtonVariant.secondary;
    return SizedBox(
      width: double.infinity,
      child: Material(
        color: isSecondary ? const Color(0xFF0A0A0F) : (disabled ? AppColors.accentDim : AppColors.accent),
        borderRadius: BorderRadius.circular(2),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(2),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 13),
            alignment: Alignment.center,
            decoration: isSecondary ? BoxDecoration(border: Border.all(color: AppColors.border)) : null,
            child: Text(
              label,
              style: AppText.body(size: 14, weight: FontWeight.w600, color: isSecondary ? AppColors.text : Colors.white),
            ),
          ),
        ),
      ),
    );
  }
}

class AppInput extends StatelessWidget {
  final TextEditingController controller;
  final String placeholder;
  final bool obscure;
  final TextInputType? keyboardType;
  final TextCapitalization capitalization;
  final ValueChanged<String>? onSubmitted;

  const AppInput({
    super.key,
    required this.controller,
    required this.placeholder,
    this.obscure = false,
    this.keyboardType,
    this.capitalization = TextCapitalization.none,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboardType,
      textCapitalization: capitalization,
      onSubmitted: onSubmitted,
      style: AppText.body(size: 14, color: AppColors.text),
      cursorColor: AppColors.accent,
      decoration: InputDecoration(
        hintText: placeholder,
        hintStyle: AppText.body(size: 14, color: const Color(0xFF555570)),
        filled: true,
        fillColor: AppColors.bg,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(2), borderSide: const BorderSide(color: AppColors.border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(2), borderSide: const BorderSide(color: AppColors.border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(2), borderSide: const BorderSide(color: AppColors.accent)),
      ),
    );
  }
}

class AppLabel extends StatelessWidget {
  final String text;
  const AppLabel(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(text, style: AppText.body(size: 12, color: AppColors.muted)),
    );
  }
}
