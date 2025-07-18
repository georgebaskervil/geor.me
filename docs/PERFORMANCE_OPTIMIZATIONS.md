# Frontend Performance Optimizations

This document outlines the performance optimizations implemented across the frontend to improve animation smoothness and reduce paint/layout costs.

## 🎯 Overview

The optimizations focus primarily on the strategic use of `will-change` CSS property and related performance improvements for elements that frequently animate or transform.

## 🚀 Optimizations Implemented

### 1. **Dynamic will-change Management**

Rather than applying `will-change` statically in CSS, we now manage it dynamically via JavaScript to avoid memory overhead when animations aren't active.

**Files affected:**

- `app/javascript/controllers/cursor_controller.coffee`
- `app/javascript/composables/useDragDrop.js`
- `app/javascript/utils/performance.js` (new utility file)

### 2. **Hover-Based Optimizations**

Elements with hover animations now enable `will-change` only during hover states:

**Files optimized:**

- `app/stylesheets/homepage.scss` - Project cards, carousel controls, indicators
- `app/stylesheets/posts.scss` - Post cards
- `app/stylesheets/images.scss` - Image containers
- `app/stylesheets/avatar.scss` - Avatar container
- `app/stylesheets/cipher.scss` - Cipher cells and buttons
- `app/stylesheets/taskstack.scss` - Task control buttons

**Pattern:**

```scss
&:hover {
  transform: scale(1.1);
  will-change: transform; // Enable during animation
}

&:not(:hover) {
  will-change: auto; // Disable when not animating
}
```

### 3. **Constantly Animating Elements**

Elements that frequently animate have optimized `will-change` properties:

- **Custom Cursor** - Dynamic management via JavaScript
- **Oneko Cat** - `will-change: transform, background-position`
- **Heart Explosions** - `will-change: transform, opacity`
- **Drawer Animations** - `will-change: height, box-shadow`
- **Carousel Elements** - `will-change: transform, opacity`

### 4. **Drag & Drop Optimizations**

The drag and drop system now:

- Enables `will-change: transform, box-shadow` during drag start
- Removes `will-change` during cleanup
- Optimizes drop indicators with `will-change: opacity, transform`

## 🛠 Performance Utilities

A new utility file `app/javascript/utils/performance.js` provides:

- `enableWillChange(element, properties)` - Enable optimization
- `disableWillChange(element)` - Disable optimization
- `temporaryWillChange(element, properties, duration)` - Temporary optimization
- `optimizeForHover(element, properties)` - Hover-based optimization
- `debouncedWillChange(element, properties, delay)` - Debounced optimization
- `prefersReducedMotion()` - Respect user motion preferences

## 📊 Expected Performance Benefits

### Before Optimizations

- Unnecessary composite layers created for static elements
- Higher memory usage from permanent `will-change` declarations
- Suboptimal animation performance during hover/interaction states

### After Optimizations

- **Reduced Memory Usage** - `will-change` only active when needed
- **Smoother Animations** - Optimized compositing for active animations
- **Better Battery Life** - Reduced GPU load when animations aren't running
- **Improved Responsiveness** - Better frame rates during interactions

## 🔧 Implementation Best Practices

### Do's

✅ Enable `will-change` just before animations start
✅ Disable `will-change` when animations complete
✅ Use specific properties in `will-change` rather than `auto`
✅ Respect user's reduced motion preferences

### Don'ts

❌ Leave `will-change` enabled permanently on static elements
❌ Use `will-change: auto` for elements that will animate
❌ Apply `will-change` to too many elements simultaneously
❌ Forget to clean up `will-change` after animations

## 🧪 Testing & Validation

To verify these optimizations:

1. **Chrome DevTools Performance Tab**

   - Record performance during animations
   - Check for reduced paint/composite times
   - Verify fewer composite layers created

2. **Browser Memory Usage**

   - Monitor memory usage before/after hover states
   - Ensure memory is freed when animations stop

3. **Frame Rate Monitoring**
   - Use Chrome DevTools Rendering tab
   - Enable "FPS meter" during animations
   - Verify smoother frame rates (closer to 60fps)

## 🔄 Future Considerations

- Monitor for new animation-heavy components
- Consider intersection observer for off-screen optimizations
- Evaluate CSS `contain` property for further optimizations
- Consider `transform3d()` for additional GPU acceleration where appropriate

## 🐛 Troubleshooting

If animations feel less smooth after these changes:

1. Check browser console for JavaScript errors
2. Verify `will-change` is being applied during animations
3. Test with different browsers to isolate issues
4. Use reduced motion preferences to test fallbacks
