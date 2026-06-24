"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductCreatePayload = {
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  images: string[];
};

export type ProductUpdatePayload = Partial<ProductCreatePayload> & {
  isActive?: boolean;
};

export type ProductFilters = {
  categorySlug?: string;
  isActive?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
};

// Prisma select shape reused throughout the file
const productSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  stock: true,
  isActive: true,
  images: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: { id: true, name: true, slug: true, imageUrl: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductRecord = Prisma.ProductGetPayload<{
  select: typeof productSelect;
}>;

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<
  { authorized: true } | { authorized: false; error: string }
> {
  const session = await auth();
  if (!session?.user)
    return { authorized: false, error: "Authentication required." };
  if ((session.user as { role?: string }).role !== Role.ADMIN)
    return { authorized: false, error: "Forbidden: Admin privileges required." };
  return { authorized: true };
}

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

function validateProductPayload(
  data: ProductCreatePayload
): string | null {
  if (!data.name?.trim() || data.name.trim().length < 2)
    return "Product name must be at least 2 characters.";
  if (!data.slug?.trim())
    return "Product slug is required.";
  if (!data.description?.trim() || data.description.trim().length < 10)
    return "Description must be at least 10 characters.";
  if (!Number.isFinite(data.price) || data.price < 0)
    return "Price must be a non-negative number.";
  if (!Number.isInteger(data.stock) || data.stock < 0)
    return "Stock must be a non-negative integer.";
  if (!data.categoryId?.trim())
    return "Category is required.";
  if (!Array.isArray(data.images) || data.images.length === 0)
    return "At least one product image is required.";
  return null;
}

// ─── PUBLIC ACTIONS ───────────────────────────────────────────────────────────

/**
 * PUBLIC — Fetch products with optional filtering, pagination.
 */
export async function getProducts(
  params: ProductFilters = {}
): Promise<
  ActionResult<{ items: ProductRecord[]; total: number; pages: number }>
> {
  const {
    categorySlug,
    isActive = true,
    search,
    minPrice,
    maxPrice,
    page = 1,
    limit = 24,
  } = params;

  try {
    const where: Prisma.ProductWhereInput = {
      ...(isActive !== undefined && { isActive }),
      ...(categorySlug && {
        category: { slug: categorySlug },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(minPrice !== undefined && {
        price: { gte: toDecimal(minPrice) },
      }),
      ...(maxPrice !== undefined && {
        price: {
          ...(minPrice !== undefined ? { gte: toDecimal(minPrice) } : {}),
          lte: toDecimal(maxPrice),
        },
      }),
    };

    const skip = (page - 1) * limit;

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      success: true,
      data: { items, total, pages: Math.ceil(total / limit) },
    };
  } catch (err) {
    console.error("[getProducts]", err);
    return { success: false, error: "Failed to fetch products." };
  }
}

/**
 * PUBLIC — Fetch a single active product by slug.
 */
export async function getProductBySlug(
  slug: string
): Promise<ActionResult<ProductRecord>> {
  if (!slug?.trim())
    return { success: false, error: "Slug is required." };

  try {
    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
      select: productSelect,
    });

    if (!product)
      return { success: false, error: "Product not found." };

    return { success: true, data: product };
  } catch (err) {
    console.error("[getProductBySlug]", err);
    return { success: false, error: "Failed to fetch product." };
  }
}

/**
 * PUBLIC — Fetch a single product by ID (admin-safe, regardless of isActive).
 */
export async function getProductById(
  id: string
): Promise<ActionResult<ProductRecord>> {
  if (!id?.trim())
    return { success: false, error: "Product ID is required." };

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: productSelect,
    });
    if (!product) return { success: false, error: "Product not found." };
    return { success: true, data: product };
  } catch (err) {
    console.error("[getProductById]", err);
    return { success: false, error: "Failed to fetch product." };
  }
}

// ─── ADMIN ACTIONS ────────────────────────────────────────────────────────────

/**
 * ADMIN — Create a new product.
 * Converts numeric price to Prisma.Decimal before insert.
 */
export async function createProduct(
  data: ProductCreatePayload
): Promise<ActionResult<ProductRecord>> {
  const guard = await requireAdmin();
  if (!guard.authorized) return { success: false, error: guard.error };

  const validationError = validateProductPayload(data);
  if (validationError) return { success: false, error: validationError };

  // ── Slug uniqueness ──
  const slugConflict = await prisma.product.findUnique({
    where: { slug: data.slug.trim() },
  });
  if (slugConflict)
    return {
      success: false,
      error: `A product with slug "${data.slug}" already exists.`,
    };

  // ── Category existence ──
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category)
    return { success: false, error: "Selected category does not exist." };

  try {
    const product = await prisma.product.create({
      data: {
        name: data.name.trim(),
        slug: data.slug.trim(),
        description: data.description.trim(),
        price: toDecimal(data.price),
        stock: data.stock,
        categoryId: data.categoryId,
        images: data.images.filter(Boolean),
        isActive: true,
      },
      select: productSelect,
    });

    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/admin/products");
    revalidatePath("/");

    return { success: true, data: product };
  } catch (err) {
    console.error("[createProduct]", err);
    return { success: false, error: "Failed to create product." };
  }
}

/**
 * ADMIN — Update an existing product.
 * Safely merges partial fields; converts price to Decimal if present.
 */
export async function updateProduct(
  id: string,
  data: ProductUpdatePayload
): Promise<ActionResult<ProductRecord>> {
  const guard = await requireAdmin();
  if (!guard.authorized) return { success: false, error: guard.error };

  if (!id?.trim())
    return { success: false, error: "Product ID is required." };

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Product not found." };

  // Build a strongly-typed update payload — only include fields explicitly provided
  const updateData: Prisma.ProductUpdateInput = {};

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (name.length < 2)
      return { success: false, error: "Product name must be at least 2 characters." };
    updateData.name = name;
  }

  if (data.slug !== undefined) {
    const slug = data.slug.trim();
    const conflict = await prisma.product.findFirst({
      where: { slug, NOT: { id } },
    });
    if (conflict)
      return { success: false, error: `Slug "${slug}" is already in use.` };
    updateData.slug = slug;
  }

  if (data.description !== undefined) {
    if (data.description.trim().length < 10)
      return {
        success: false,
        error: "Description must be at least 10 characters.",
      };
    updateData.description = data.description.trim();
  }

  if (data.price !== undefined) {
    if (!Number.isFinite(data.price) || data.price < 0)
      return { success: false, error: "Price must be a non-negative number." };
    updateData.price = toDecimal(data.price);
  }

  if (data.stock !== undefined) {
    if (!Number.isInteger(data.stock) || data.stock < 0)
      return {
        success: false,
        error: "Stock must be a non-negative integer.",
      };
    updateData.stock = data.stock;
  }

  if (data.categoryId !== undefined) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category)
      return { success: false, error: "Selected category does not exist." };
    updateData.category = { connect: { id: data.categoryId } };
  }

  if (data.images !== undefined) {
    const filtered = data.images.filter(Boolean);
    if (filtered.length === 0)
      return { success: false, error: "At least one image is required." };
    updateData.images = filtered;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      select: productSelect,
    });

    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/admin/products");
    revalidatePath("/");

    return { success: true, data: product };
  } catch (err) {
    console.error("[updateProduct]", err);
    return { success: false, error: "Failed to update product." };
  }
}

/**
 * ADMIN — Soft-delete a product (sets isActive = false).
 * Hard-delete variant is commented out below — use with caution.
 */
export async function deleteProduct(
  id: string
): Promise<ActionResult<{ id: string; name: string }>> {
  const guard = await requireAdmin();
  if (!guard.authorized) return { success: false, error: guard.error };

  if (!id?.trim())
    return { success: false, error: "Product ID is required." };

  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  if (!product) return { success: false, error: "Product not found." };

  try {
    // ── SOFT DELETE (preferred — preserves order history integrity) ──
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    /*
     * ── HARD DELETE (uncomment if you're certain no orders reference this product) ──
     * const orderCount = await prisma.orderItem.count({ where: { productId: id } });
     * if (orderCount > 0) {
     *   return {
     *     success: false,
     *     error: `Cannot delete: product appears in ${orderCount} order(s). Deactivate it instead.`,
     *   };
     * }
     * await prisma.product.delete({ where: { id } });
     */

    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/admin/products");
    revalidatePath("/");

    return { success: true, data: { id, name: product.name } };
  } catch (err) {
    console.error("[deleteProduct]", err);
    return { success: false, error: "Failed to delete product." };
  }
}

/**
 * ADMIN — Restore a previously soft-deleted product.
 */
export async function restoreProduct(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAdmin();
  if (!guard.authorized) return { success: false, error: guard.error };

  if (!id?.trim())
    return { success: false, error: "Product ID is required." };

  try {
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: true },
      select: { id: true, slug: true },
    });

    revalidatePath("/products");
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/admin/products");

    return { success: true, data: { id } };
  } catch (err) {
    console.error("[restoreProduct]", err);
    return { success: false, error: "Failed to restore product." };
  }
}