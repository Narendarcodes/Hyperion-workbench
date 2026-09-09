# Semantic HTML and ARIA Best Practices (2026)

The foundation of accessibility is semantic HTML. ARIA should only be used to augment where native HTML falls short.

## 1. Landmark Elements

Use landmark elements to define the structure of the page.

-   `<header>`: Global site navigation and branding.
-   `<main>`: The unique content of the page.
-   `<nav>`: Navigation links.
-   `<aside>`: Complementary content (sidebar).
-   `<footer>`: Site-wide links and metadata.

## 2. Heading Hierarchies

-   Only one `<h1>` per page.
-   Never skip heading levels (e.g., go from `<h2>` to `<h4>`).
-   Use headings to create a logical "Outline" of the content.

## 3. Native vs. ARIA

**The First Rule of ARIA**: If you can use a native HTML element or attribute with the semantics and behavior you require already built-in, then do so.

-   *Bad*: `<div role="button" onclick="...">Submit</div>`
-   *Good*: `<button type="submit">Submit</button>`

## 4. Essential ARIA Attributes

-   `aria-label`: For icon-only buttons.
-   `aria-expanded`: For accordions and dropdowns.
-   `aria-live`: For dynamic content updates (e.g., toast notifications).
-   `aria-invalid`: For form validation errors.

## 5. Form Accessibility

```html
<label for="email-input">Email Address</label>
<input 
  id="email-input" 
  type="email" 
  aria-describedby="email-hint" 
  required
>
<p id="email-hint">We'll never share your email.</p>
```

---
*Updated: January 22, 2026 - 20:00*
