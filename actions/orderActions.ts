"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Updated for NextAuth v5
import { revalidatePath } from "next/cache";
import type { CartItem } from "@/store/useCartStore";
import type { PaymentStatus, OrderStatus } from "@prisma/client";
import { Prisma } from "@prisma/client"; // Updated for Prisma 7

// ─────────────────────────────────────────────
// USER ACTION: Create Order from Cart
// ─────────────────────────────────────────────

interface CreateOrderPayload {
  items: CartItem[];
  notes?: string; // e.g. shipping address
}

export async function createOrder(
  payload: CreateOrderPayload
): Promise<{ success: true; orderId: string } | { success: false; error: string }> {
  // NEXTAUTH V5: use auth() instead of getServerSession
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in to place an order." };
  }

  const { items, notes } = payload;

  if (!items || items.length === 0) {
    return { success: false, error: "Your cart is empty." };
  }

  // ── Validate stock for each item ──────────────────────────────
  const productIds = items.map((i) => i.id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, stock: true, price: true, name: true, images: true },
  });

  for (const cartItem of items) {
    const dbProduct = products.find((p) => p.id === cartItem.id);
    if (!dbProduct) {
      return {
        success: false,
        error: `Product "${cartItem.name}" is no longer available.`,
      };
    }
    if (dbProduct.stock < cartItem.quantity) {
      return {
        success: false,
        error: `Insufficient stock for "${cartItem.name}". Only ${dbProduct.stock} left.`,
      };
    }
  }

  // ── Calculate total from DB prices (never trust client) ───────
  const totalAmount = products.reduce((sum, dbProduct) => {
    const cartItem = items.find((i) => i.id === dbProduct.id)!;
    return sum + Number(dbProduct.price) * cartItem.quantity;
  }, 0);

  // ── Create Order + OrderItems in a transaction ────────────────
  try {
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: session.user.id,
          totalAmount: new Prisma.Decimal(totalAmount),
          notes: notes ?? null,
          orderItems: {
            create: products.map((dbProduct) => {
              const cartItem = items.find((i) => i.id === dbProduct.id)!;
              return {
                productId: dbProduct.id,
                productName: dbProduct.name,
                productImage: dbProduct.images[0] ?? null,
                unitPrice: dbProduct.price,
                quantity: cartItem.quantity,
              };
            }),
          },
        },
      });

      // Decrement stock atomically
      await Promise.all(
        products.map((dbProduct) => {
          const cartItem = items.find((i) => i.id === dbProduct.id)!;
          return tx.product.update({
            where: { id: dbProduct.id },
            data: { stock: { decrement: cartItem.quantity } },
          });
        })
      );

      return newOrder;
    });

    return { success: true, orderId: order.id };
  } catch (err) {
    console.error("[createOrder] Transaction failed:", err);
    return { success: false, error: "Order creation failed. Please try again." };
  }
}

// ─────────────────────────────────────────────
// USER ACTION: Confirm Payment Submitted
// Sets status to PENDING_VERIFICATION
// ─────────────────────────────────────────────

export async function confirmPaymentSubmitted(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, paymentStatus: true },
  });

  if (!order) return { success: false, error: "Order not found." };
  if (order.userId !== session.user.id) return { success: false, error: "Forbidden." };
  
  // Fixed logic: Check if it's in the awaiting submission state
  if (order.paymentStatus !== "PENDING_VERIFICATION") {
    // Already processed or verified
    return { success: true };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PENDING_VERIFICATION" },
  });

  revalidatePath("/orders");
  revalidatePath(`/checkout/payment/${orderId}`);
  return { success: true };
}

// ─────────────────────────────────────────────
// ADMIN ACTION: Update Order Status
// ─────────────────────────────────────────────

interface UpdateOrderStatusPayload {
  orderId: string;
  paymentStatus: PaymentStatus;
  orderStatus?: OrderStatus;
}

export async function updateOrderStatus(
  payload: UpdateOrderStatusPayload
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Admin access required." };
  }

  const { orderId, paymentStatus, orderStatus } = payload;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { success: false, error: "Order not found." };

  // Derive orderStatus automatically if not provided
  let resolvedOrderStatus: OrderStatus = orderStatus ?? order.orderStatus;
  if (!orderStatus) {
    if (paymentStatus === "VERIFIED") resolvedOrderStatus = "PAID";
    if (paymentStatus === "FAILED") resolvedOrderStatus = "CANCELLED";
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus,
      orderStatus: resolvedOrderStatus,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  return { success: true };
}

// ─────────────────────────────────────────────
// SHARED: Fetch a single order with items
// ─────────────────────────────────────────────

export async function getOrderById(orderId: string) {
  const session = await auth();
  
  if (!session?.user?.id) return null;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });

  if (!order) return null;

  // Non-admin users can only see their own orders
  if (
    session.user.role !== "ADMIN" &&
    order.userId !== session.user.id
  ) {
    return null;
  }

  return order;
}