# GarmentOS Cloud — Media Infrastructure & Media Library Report

## 1. Executive Summary

GarmentOS Cloud provides factory tenants with an integrated, self-contained digital asset management solution designed specifically for apparel e-commerce. The system enables tenant owners to upload, organize, preview, and safely reference high-resolution product photography, marketing banners, and branding assets without risk of broken references or layout distortion.

## 2. Implemented Capabilities

### A. Batch Multi-File Upload
- **Endpoint**: `POST /api/v1/storefront/media/upload-multiple`
- **Controller**: `StorefrontController::uploadMultipleMedia`
- **Capacity**: 1 to 10 files per batch request.
- **Size Limits**: Up to 5MB (5120 KB) per file.
- **Allowed MIME Types**: `image/jpeg`, `image/png`, `image/webp` (Strictly validated via Laravel form request rules and server-side magic byte validation).
- **Dimension Auto-Extraction**: Automatically extracts pixel `width` and `height` upon upload using native `getimagesize()` and records metadata in tenant configuration.

### B. Drag-and-Drop Media Library UI
- **Component**: `apps/web/src/components/storefront/StorefrontDesignStudio.tsx`
- **Interaction**: Native HTML5 Drag and Drop dropzone with visual drag-over state indicator.
- **File Picker**: Enhanced `<input type="file" multiple>` accepting JPEG, PNG, and WebP.
- **Card Preview**:
  - Displays thumbnail rendered through `<StorefrontImage>`.
  - Shows file name, category, human-readable file size (KB / MB).
  - Displays pixel resolution badge (e.g., `1200 × 800`).
  - Copy-to-clipboard button for asset URL.
  - Delete button with reference protection modal.

### C. Safe Reference Checking & Force Deletion
- **Endpoint**: `DELETE /api/v1/storefront/media` with query/body payload `{ path: string, force?: boolean }`.
- **Validation**:
  - Scans `theme_config.branding.logo_url`
  - Scans `theme_config.hero_banner.desktop_image` & `mobile_image`
  - Scans `theme_config.promo_banners.*.image`
- **Behavior**:
  - If the media file is actively referenced and `force` is not set, returns HTTP 422 Unprocessable Entity with error code `MediaInUse` and a list of active usages.
  - If `force=true`, removes asset and safely cleans up disk storage (`Storage::disk('public')->delete($path)`).

### D. Universal `<StorefrontImage>` Component
- **Path**: `apps/web/src/components/storefront/common/StorefrontImage.tsx`
- **Features**:
  - Loading skeleton state with CSS shimmer pulse.
  - Graceful error boundary: On `onError`, switches to an elegant SVG placeholder displaying a garment icon and "صورة غير متوفرة / Image Unavailable".
  - Rigid aspect ratio containers (`aspect-square`, `aspect-[3/4]`, `aspect-video`, `aspect-[21/9]`) preventing layout reflow or zero-height collapsed cards.
  - Support for `object-fit: cover` and custom rounded borders.

## 3. Automated Test Coverage

The media infrastructure is validated by comprehensive PHPUnit feature tests in `apps/api/tests/Feature/StorefrontMediaAndDesignStudioTest.php`:

1. `test_tenant_can_upload_media_file`: Validates single file upload and dimension storage.
2. `test_tenant_can_upload_multiple_media_files_simultaneously`: Uploads 3 files in a single batch, asserting status 201 and 3 library records with dimensions.
3. `test_media_upload_rejects_svg_and_disallowed_formats`: Asserts that SVG and non-image files are rejected with HTTP 422 to prevent stored XSS.
4. `test_cannot_delete_media_actively_referenced_without_force`: Sets an image as hero banner, asserts HTTP 422 `MediaInUse` on standard delete, and asserts HTTP 200 on `force=true`.

**Backend Suite Status**: 80/80 tests passing (482 assertions).
