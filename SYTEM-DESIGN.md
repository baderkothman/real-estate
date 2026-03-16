# Real Estate Design System

A modern, elegant, warm-luxury design system for a real estate website using the provided palette.

---

## 1. Brand direction

### Style keywords

- modern
- elegant
- premium
- warm minimal
- editorial
- trustworthy
- architectural
- high-end lifestyle

### Visual personality

This system should feel like a **boutique property brand**, not a generic listing portal.

Core traits:

- large photography
- generous whitespace
- strong typography
- restrained color usage
- soft warm backgrounds
- dark elegant text
- subtle luxury accents

---

## 2. Color strategy

The palette is rich, but the interface should use it with restraint.

### Core brand colors

- **Primary Accent**: `--color-sandy-brown-500` → `#fa6b05`
- **Primary Hover**: `--color-sandy-brown-600` → `#c85604`
- **Primary Soft**: `--color-sandy-brown-50` → `#fef0e6`

### Luxury warm surfaces

- **Surface Warm**: `--color-apricot-cream-50` → `#fef3e7`
- **Surface Warm 2**: `--color-vanilla-custard-50` → `#faf7eb`
- **Section Tint**: `--color-vanilla-custard-100` → `#f4f0d7`

### Trust and sophistication

- **Secondary Accent**: `--color-pearl-aqua-600` → `#379579`
- **Secondary Soft**: `--color-pearl-aqua-50` → `#ecf8f5`
- **Success / Verified / Sold**: `--color-emerald-600` → `#29a366`

---

## 3. Semantic design tokens

Use semantic tokens instead of raw palette values across the UI.

```css
:root {
  /* Base */
  --background: #fcfaf7;
  --background-soft: #faf7eb;
  --surface: #ffffff;
  --surface-elevated: #fffaf5;
  --surface-muted: #fef3e7;
  --border: rgba(34, 24, 18, 0.08);
  --border-strong: rgba(34, 24, 18, 0.16);

  /* Text */
  --text-primary: #181411;
  --text-secondary: #5f554d;
  --text-muted: #8b8178;
  --text-on-dark: #fdfaf7;

  /* Brand */
  --brand: #fa6b05;
  --brand-hover: #c85604;
  --brand-soft: #fef0e6;
  --brand-strong: #964003;

  /* Secondary */
  --accent: #379579;
  --accent-soft: #ecf8f5;
  --accent-strong: #1c4a3c;

  /* Status */
  --success: #29a366;
  --success-soft: #ebfaf2;

  /* Luxury neutrals */
  --gold-soft: #c9b336;
  --gold-muted: #a18f2b;

  /* Dark theme anchors */
  --ink: #14110f;
  --charcoal: #211c18;
  --hero-overlay: rgba(20, 17, 15, 0.48);

  /* Shadows */
  --shadow-sm: 0 6px 20px rgba(24, 20, 17, 0.06);
  --shadow-md: 0 14px 40px rgba(24, 20, 17, 0.1);
  --shadow-lg: 0 24px 80px rgba(24, 20, 17, 0.16);

  /* Radius */
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 24px;
  --radius-xl: 32px;
}
```

---

## 4. Color usage rules

### 70 / 20 / 10 balance

- **70%** neutral and light backgrounds
- **20%** dark text / contrast surfaces
- **10%** accent colors

### Recommended usage

- Use `sandy-brown-500` for CTA buttons, active tabs, highlighted numbers, and key badges
- Use `apricot-cream-50` and `vanilla-custard-50` for section backgrounds
- Use `pearl-aqua-600` for map pins, filters, trust indicators, and secondary CTAs
- Use `emerald-600` for available, verified, booked viewing, or success messages

### Avoid

- using all warm tones together in one component
- large saturated orange section backgrounds
- overly colorful cards

Cards should stay mostly neutral.

---

## 5. Typography system

Typography should feel **editorial and architectural**.

### Recommended pairings

#### Option A: Premium modern

- **Headings**: `Playfair Display` or `Cormorant Garamond`
- **Body / UI**: `Inter` or `Manrope`

#### Option B: Cleaner luxury

- **Headings**: `Plus Jakarta Sans`
- **Body / UI**: `Inter`

### Best recommendation

- **Display / Hero headings**: `Playfair Display`
- **Everything else**: `Inter`

### Type scale

```css
--text-display-xl: clamp(3.5rem, 6vw, 6rem);
--text-display-lg: clamp(2.75rem, 4.5vw, 4.5rem);
--text-h1: clamp(2.25rem, 3.5vw, 3.5rem);
--text-h2: clamp(1.75rem, 2.5vw, 2.5rem);
--text-h3: 1.5rem;
--text-h4: 1.25rem;
--text-body-lg: 1.125rem;
--text-body: 1rem;
--text-sm: 0.875rem;
--text-xs: 0.75rem;
```

### Usage guidance

- Hero title: serif, semi-bold, tight line-height
- Section titles: serif or refined sans
- Property card titles: sans, semi-bold
- Metadata: small uppercase or letter-spaced sans
- Numbers / price tags: bold sans

### Suggested styles

- Hero title: `font-serif text-[clamp(3rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.03em]`
- Section title: `font-serif text-4xl md:text-5xl leading-tight`
- Body: `text-base leading-7 text-[var(--text-secondary)]`
- Labels: `text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]`

---

## 6. Spacing system

Real estate design benefits from space and rhythm.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
--space-32: 128px;
```

### Layout rules

- Section vertical padding: **80–120px**
- Card padding: **24–32px**
- Large hero spacing: **96px+**
- Grid gaps: **24–32px**
- Max content width: **1280px–1440px**

---

## 7. Grid and layout principles

### Containers

- Main container: `max-width: 1280px`
- Wide showcase sections: `max-width: 1440px`
- Blog/article style sections: `max-width: 900px`

### Grid recommendations

- Property cards: 3 columns desktop, 2 tablet, 1 mobile
- Hero split: 5/7 or 6/6
- Agent / trust / stats strip: 4-column grid
- Listing page: sidebar `320px` + content auto

### Section rhythm

Alternate between:

- white sections
- warm tinted sections
- dark image-overlay sections

This creates a premium editorial flow.

---

## 8. Border radius and surfaces

### Recommended radii

- Inputs: `14px`
- Cards: `20px`
- Large panels: `24px`
- Buttons: `999px` for pill CTA or `14px` for formal buttons

### Surface treatment

- Cards should be white or slightly warm white
- Borders should be subtle
- Shadows should be soft and refined

---

## 9. Component styling rules

### Buttons

#### Primary button

Used for:

- Explore Properties
- Book Viewing
- Get in Touch

Style:

- Background: `--brand`
- Text: white
- Hover: `--brand-hover`
- Shape: pill or rounded-lg
- Font weight: 600

#### Secondary button

- Background: transparent or white
- Border: subtle neutral
- Text: dark
- Hover: warm tinted background

#### Accent button

Use `pearl-aqua` sparingly for map, neighborhood guide, or calculator interactions.

---

## 10. Property cards

Property cards should feel clean, premium, and sales-oriented.

### Structure

- large image
- badge
- price
- title
- location
- compact metadata row
- CTA / favorite action

### Style

- white card
- `24px` radius
- thin border
- soft shadow
- slight raise and image zoom on hover

### Card tokens

- background: `--surface`
- border: `--border`
- hover shadow: `--shadow-md`
- badge background: `--brand-soft`
- badge text: `--brand-strong`

---

## 11. Hero section system

The hero should immediately communicate trust and prestige.

### Recommended composition

**Left side**

- eyebrow label
- large editorial heading
- supporting paragraph
- CTA group
- trust stats

**Right side**

- large property image
- floating info card
- optional search panel overlay

### Hero background options

#### Option 1

- full white / cream background
- rounded-corner property image

#### Option 2

- dark image hero with gradient overlay
- white text
- orange CTA
- floating warm-white search box

#### Option 3

- split layout with warm neutral background and architectural photography

### Best fit for this palette

- warm cream base
- dark text
- orange CTA
- subtle pearl-aqua accents

---

## 12. Search and filter UI

Search should feel like a concierge interface.

### Style

- white elevated panel
- soft shadow
- `20–24px` radius
- spacious internal padding
- elegant input labels
- strong active states

### Selected filters

- background: `--brand-soft`
- text: `--brand-strong`

### Map / list toggle

- selected: `--accent`
- unselected: neutral surface

---

## 13. Status colors for real estate

Use consistent color semantics.

- **Available** → `emerald-600`
- **New listing** → `sandy-brown-500`
- **Premium / Featured** → `vanilla-custard-500` on soft neutral
- **Reduced price** → `pearl-aqua-600`
- **Sold / Reserved** → dark neutral with low-saturation background

---

## 14. Imagery direction

The photography style must match the interface.

### Use

- warm daylight interiors
- luxury exteriors
- architectural lines
- lifestyle moments
- clean composition
- muted saturation
- premium urban or villa shots

### Avoid

- oversaturated HDR
- cluttered interiors
- generic low-quality stock photos

---

## 15. Iconography

Recommended icon sets:

- Lucide
- Tabler
- Phosphor

### Guidelines

- 1.75px or 2px stroke
- simple geometric forms
- no playful iconography

### Common use cases

- beds
- baths
- square meters
- parking
- map pin
- phone
- calendar
- verification
- transport / schools / neighborhood

---

## 16. Motion system

Animation should feel refined, not flashy.

### Recommended motion

- fade-up on section entry
- image zoom on hover
- card lift on hover
- subtle button translateY
- tab underline slide
- number counter animations for stats

### Avoid

- bouncing effects
- aggressive parallax
- glow-heavy effects
- overly fast transitions

### Timing

- standard: `220ms`
- slow: `320ms`
- easing: `cubic-bezier(0.22, 1, 0.36, 1)`

---

## 17. Recommended page section styling

### Home page

1. Hero
2. Trusted stats strip
3. Featured properties
4. Neighborhood / area guide
5. Why choose us
6. Premium listings carousel
7. Agent showcase
8. Testimonials
9. CTA banner
10. Footer

### Listing page

- left filters
- right property grid
- map toggle
- sort dropdown
- saved search CTA

### Property details page

- large image gallery
- price / title / location
- info chips
- description
- amenities
- floor plan
- map
- agent card
- schedule viewing CTA

---

## 18. Tailwind semantic setup suggestion

```css
:root {
  --bg: 252 250 247;
  --bg-soft: 250 247 235;
  --surface: 255 255 255;
  --text: 24 20 17;
  --text-secondary: 95 85 77;

  --brand: 250 107 5;
  --brand-hover: 200 86 4;
  --brand-soft: 254 240 230;

  --accent: 55 149 121;
  --accent-soft: 236 248 245;

  --success: 41 163 102;
}
```

### Example utility usage

- `bg-[rgb(var(--surface))]`
- `text-[rgb(var(--text))]`
- `bg-[rgb(var(--brand))]`
- `hover:bg-[rgb(var(--brand-hover))]`

---

## 19. Example component styles

### Primary button

```html
<button
  class="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--brand-hover)] hover:-translate-y-0.5"
>
  Explore Properties
</button>
```

### Secondary button

```html
<button
  class="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
>
  Book a Viewing
</button>
```

### Property card

```html
<div
  class="overflow-hidden rounded-[24px] border border-[var(--border)] bg-white shadow-[var(--shadow-sm)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
>
  ...
</div>
```

---

## 20. Best palette mapping for key elements

### Main CTA

- background: `sandy-brown-500`
- hover: `sandy-brown-600`

### Featured badge

- background: `sandy-brown-50`
- text: `sandy-brown-700`

### Section backgrounds

- `vanilla-custard-50`
- `apricot-cream-50`

### Map / neighborhood / trust features

- `pearl-aqua-600`

### Available / success

- `emerald-600`

### Premium data chips

- white or near-white with thin border
- avoid strongly colored chip backgrounds by default

---

## 21. Dark luxury section option

Use a dark section for premium content like “Exclusive Collection” or “Private Villas”.

### Recommended styling

- background: `#14110f`
- heading: `#fdfaf7`
- paragraph: warm off-white
- CTA: `sandy-brown-500`
- borders: transparent white at low opacity

This creates contrast and elevates the premium feel.

---

## 22. Design principles to keep it elegant

1. Let photography and typography carry most of the luxury feel
2. Use orange as an accent, not the whole interface
3. Keep cards mostly white
4. Use warm backgrounds to separate sections
5. Use aqua/emerald for trust and clarity, not decoration
6. Favor large spacing over excessive visual effects
7. Keep icons minimal and metadata structured
8. Make every CTA feel intentional

---

## 23. Final recommended formula

### Best overall direction

- **Background:** warm off-white / vanilla cream
- **Text:** deep charcoal
- **Primary CTA:** sandy brown 500
- **Secondary accent:** pearl aqua 600
- **Success:** emerald 600
- **Cards:** white with subtle border and soft shadow
- **Typography:** Playfair Display + Inter
- **Corners:** 20–24px
- **Motion:** subtle lift and fade

### Outcome

This produces a website that feels:

- modern
- elegant
- warm
- premium
- trustworthy

Perfect for a high-end real estate brand.
