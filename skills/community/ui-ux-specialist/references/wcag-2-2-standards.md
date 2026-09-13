# WCAG 2.2 Level AA Standards (2026)

In 2026, compliance with WCAG 2.2 is the baseline requirement for all professional web applications.

## 1. The Four Principles (POUR)

1.  **Perceivable**: Users must be able to perceive the information being presented.
    -   *Action*: Provide text alternatives for non-text content.
2.  **Operable**: Users must be able to operate the interface.
    -   *Action*: Make all functionality available from a keyboard.
3.  **Understandable**: Users must be able to understand the information and the operation of the user interface.
    -   *Action*: Make text readable and predictable.
4.  **Robust**: Users must be able to access the content as technologies advance.
    -   *Action*: Maximize compatibility with current and future user tools (Assistive Technologies).

## 2. New Success Criteria in 2.2

-   **Focus Not Obscured**: Ensure that the focus indicator is always visible and not covered by sticky headers or floating elements.
-   **Target Size (Minimum)**: Interactive elements must have a minimum size of 24x24 pixels.
-   **Redundant Entry**: Prevent users from having to re-enter information they've already provided in the same session.

## 3. Contrast Ratios

-   **Normal Text**: 4.5:1 minimum.
-   **Large Text (18pt+)**: 3:1 minimum.
-   **UI Components**: 3:1 minimum for borders, icons, and focus rings.

## 4. Reduced Motion

Always respect the user's system settings for motion.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 5. Testing Tools

-   **Axe-core**: For automated accessibility audits.
-   **Screen Readers**: Manual testing with NVDA, JAWS, or VoiceOver.
-   **Keyboard-Only Test**: Navigate the entire app without a mouse.

---
*Updated: January 22, 2026 - 20:00*
