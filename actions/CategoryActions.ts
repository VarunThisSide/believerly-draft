"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CategoryPayload = {
  name: string;
  slug: string;
  imageUrl?: string;
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<
  { authorized: true } | { authorized: false; error: string }
> {
  const session = await auth();
  if (!session?.user) {
    return { authorized: false, error: "Authentication required." };
  }
  if ((session.user as { role?: string }).role !== Role.ADMIN) {
    return {
      authorized: false,
      error: "Forbidden: Admin privileges required.",
    };
  }
  return { authorized: true };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * PUBLIC — fetch all categories ordered alphabetically.
 */
export async function getCategories(): Promise<
  ActionResult<
    {
      id: string;
      name: string;
      slug: string;
      imageUrl: string | null;
      _count: { products: number };
    }[]
  >
> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return { success: true, data: categories };
  } catch (err) {
    console.error("[getCategories]", err);
    return { success: false, error: "Failed to fetch categories." };
  }
}

/**
 * ADMIN — create a new category.
 * Validates that name/slug are non-empty and slug is globally unique.
 */
export async function createCategory(
  data: CategoryPayload
): Promise<ActionResult<{ id: string; name: string; slug: string }>> {
  const guard = await requireAdmin();
  if (!guard.authorized) return { success: false, error: guard.error };

  // ── Validate ──
  const name = data.name?.trim();
  const slug = data.slug ? slugify(data.slug) : slugify(name);
  const imageUrl = data.imageUrl?.trim() || null;

  if (!name || name.length < 2) {
    return {
      success: false,
      error: "Category name must be at least 2 characters.",
    };
  }
  if (!slug) {
    return { success: false, error: "Category slug is required." };
  }
  if (slug.length > 100) {
    return {
      success: false,
      error: "Slug must be 100 characters or fewer.",
    };
  }

  // ── Uniqueness check ──
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    return {
      success: false,
      error: `A category with slug "${slug}" already exists.`,
    };
  }

  try {
    const category = await prisma.category.create({
      data: { name, slug, imageUrl },
      select: { id: true, name: true, slug: true },
    });

    revalidatePath("/");
    revalidatePath("/admin/categories");
    revalidatePath("/products");

    return { success: true, data: category };
  } catch (err) {
    console.error("[createCategory]", err);
    return { success: false, error: "Failed to create category." };
  }
}

/**
 * ADMIN — delete a category.
 * Blocked if any products still reference this category.
 */
export async function deleteCategory(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAdmin();
  if (!guard.authorized) return { success: false, error: guard.error };

  if (!id?.trim()) {
    return { success: false, error: "Category ID is required." };
  }

  // ── Guard: products attached? ──
  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });
  if (productCount > 0) {
    return {
      success: false,
      error: `Cannot delete: ${productCount} product(s) are still assigned to this category. Re-assign or remove them first.`,
    };
  }

  // ── Existence check ──
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return { success: false, error: "Category not found." };
  }

  try {
    await prisma.category.delete({ where: { id } });

    revalidatePath("/");
    revalidatePath("/admin/categories");
    revalidatePath("/products");

    return { success: true, data: { id } };
  } catch (err) {
    console.error("[deleteCategory]", err);
    return { success: false, error: "Failed to delete category." };
  }
}

/**
 * ADMIN — update an existing category's name, slug, or image.
 */
export async function updateCategory(
  id: string,
  data: Partial<CategoryPayload>
): Promise<ActionResult<{ id: string; name: string; slug: string }>> {
  const guard = await requireAdmin();
  if (!guard.authorized) return { success: false, error: guard.error };

  if (!id?.trim()) {
    return { success: false, error: "Category ID is required." };
  }

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Category not found." };
  }

  const updateData: Partial<{ name: string; slug: string; imageUrl: string | null }> = {};

  if (data.name !== undefined) {
    const name = data.name.trim();
    if (name.length < 2)
      return {
        success: false,
        error: "Category name must be at least 2 characters.",
      };
    updateData.name = name;
  }

  if (data.slug !== undefined) {
    const slug = slugify(data.slug);
    if (!slug)
      return { success: false, error: "Invalid slug provided." };
    // Confirm uniqueness excluding self
    const conflict = await prisma.category.findFirst({
      where: { slug, NOT: { id } },
    });
    if (conflict)
      return {
        success: false,
        error: `Slug "${slug}" is already in use.`,
      };
    updateData.slug = slug;
  }

  if (data.imageUrl !== undefined) {
    updateData.imageUrl = data.imageUrl?.trim() || null;
  }

  try {
    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, slug: true },
    });

    revalidatePath("/");
    revalidatePath("/admin/categories");
    revalidatePath(`/products`);

    return { success: true, data: updated };
  } catch (err) {
    console.error("[updateCategory]", err);
    return { success: false, error: "Failed to update category." };
  }
}