# Design System

This document defines the core design system used throughout the application to maintain a consistent look and feel.

## Color System

| Element | Tailwind Classes | Usage |
|---------|------------------|-------|
| Page Background | `bg-gray-50` | Main application background |
| Card Background | `bg-white` | Project cards, task cards, form containers |
| Heading Text | `text-gray-900 font-semibold` | Page titles, section headings, card titles |
| Body Text | `text-gray-600` | Descriptions, helper text, secondary content |

---

## Buttons

### Primary Button

**Classes**

```text
bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg
```

**Usage**

- Submit
- Create
- Save
- Confirm

---

### Danger Button

**Classes**

```text
bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg
```

**Usage**

- Delete
- Remove
- Destructive actions

---

## Layout

| Property | Tailwind Class | Usage |
|----------|----------------|-------|
| Border Radius | `rounded-lg` | Cards, buttons, inputs |
| Standard Padding | `px-4 py-2` | Buttons, inputs |
| Card Padding | `p-6` | Internal spacing for cards |

---

## Priority Badges

| Priority | Tailwind Classes |
|----------|------------------|
| **HIGH** | `bg-red-100 text-red-800` |
| **MEDIUM** | `bg-yellow-100 text-yellow-800` |
| **LOW** | `bg-green-100 text-green-800` |

---

## Status Badges

| Status | Tailwind Classes |
|--------|------------------|
| **TODO** | `bg-gray-100 text-gray-800` |
| **IN_PROGRESS** | `bg-blue-100 text-blue-800` |
| **DONE** | `bg-green-100 text-green-800` |

---

## Quick Reference

| Component | Classes |
|-----------|---------|
| Page | `bg-gray-50` |
| Card | `bg-white rounded-lg p-6` |
| Primary Button | `bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2` |
| Danger Button | `bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2` |
| Input | `rounded-lg px-4 py-2` |
| Heading | `text-gray-900 font-semibold` |
| Body Text | `text-gray-600` |

---

## Design Principles

- Maintain consistent spacing using the predefined padding utilities.
- Use `rounded-lg` as the standard border radius across components.
- Reserve blue for primary actions and red for destructive actions.
- Display priorities and statuses using their designated badge colors.
- Keep the page background light (`bg-gray-50`) while placing content inside white cards (`bg-white`) for clear visual hierarchy.