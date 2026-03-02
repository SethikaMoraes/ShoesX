# ShoesX

ShoesX is a React + TailwindCSS e-commerce platform powered by Supabase (Auth, Postgres, and Realtime).

## Legacy HTML Files

Yes, it is safe to delete legacy standalone HTML files (for example `admin.html`, `products.html`, `product-detail.html`, `profile.html`) after migration.

Do **not** delete the root `index.html` because Vite requires it.

## Tech Stack

- React (Vite)
- React Router
- TailwindCSS
- Supabase Auth
- Supabase Postgres + Realtime

## Environment Variables

Create a `.env` file (or copy `.env.example`) and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## QA Checklist

Use `QA_CHECKLIST.md` for submission testing evidence.

## Database Tables Used

- `users_profile`
- `products`
- `orders`
- `cart_items`
- `user_favourites`
- `size_history`
- `user_measurements`
- `feedback`
- `contact_messages`
- `custom_orders`
- `product_ratings`
- `faqs`
- `chats`
- `chat_messages`

## Admin Access Rule

- The admin account is identified by email: `admin@gmail.com`.
- Admin UI access is role-gated in the app and enforced through Supabase RLS.

## Security Notes

- Live chat is configured for authenticated users.
- Hiding admin links in the UI is not security by itself; Supabase RLS policies are required and enforced for admin data access.

## Project Structure

- `src/` application source (pages, components, contexts, hooks, services)
- `public/` static assets (`/assets`, `/models`)
- `sql/` Supabase schema and policy scripts
- `legacy/` archived static-site files

## Image Setup

1. Add image files to `public/assets`.
2. Use absolute asset paths (for example `/assets/my-shoe.webp`) or valid HTTPS URLs.
3. In admin product forms, provide product image URLs only (do not use the site logo as a product image).

## Main Routes

- `/`
- `/products`
- `/product/:id`
- `/3d-view`
- `/fit-assurance`
- `/favourites`
- `/profile`
- `/order-status`
- `/feedback`
- `/faq`
- `/custom-order`
- `/about`
- `/blog`
- `/contact`
- `/privacy`
- `/terms`
- `/returns`
- `/admin/*` (admin only)
