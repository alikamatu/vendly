# Vendly Admin

Admin dashboard for the Vendly marketplace. From the repo root, run `pnpm --filter @vendly/admin dev` and open http://localhost:3002.

Reads `NEXT_PUBLIC_API_URL` (else `NEXT_PUBLIC_VENDLY_API_URL`, else `VENDLY_API_URL`), `NEXT_PUBLIC_VENDLY_ADMIN_TOKEN` (else `VENDLY_ADMIN_TOKEN`), `NEXT_PUBLIC_STORE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
