import { relations } from "drizzle-orm"
import { account, session, user } from "./auth-schema"
import { addresses } from "./address-schema"
import { stores } from "./store-schema"
import { categories } from "./category-schema"
import { products } from "./product-schema"
import { productImages } from "./product-image-schema"
import { carts } from "./cart-schema"
import { cartItems } from "./cart-item-schema"
import { vouchers } from "./voucher-schema"
import { payments } from "./payment-schema"
import { orders } from "./order-schema"
import { orderItems } from "./order-item-schema"
import { shipments } from "./shipment-schema"
import { reviews } from "./review-schema"
import { conversations } from "./conversation-schema"
import { messages } from "./message-schema"

// Auth Relations
export const userRelations = relations(user, ({ many, one }) => ({
    sessions: many(session),
    accounts: many(account),
    addresses: many(addresses),
    stores: many(stores),
    cart: one(carts),
    payments: many(payments),
    conversations: many(conversations),
    messages: many(messages),
}))

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}))

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}))

// Store & Address Relations
export const addressesRelations = relations(addresses, ({ one }) => ({
    user: one(user, { fields: [addresses.userId], references: [user.id] }),
    store: one(stores, { fields: [addresses.storeId], references: [stores.id] }),
}))

export const storesRelations = relations(stores, ({ one, many }) => ({
    user: one(user, { fields: [stores.userId], references: [user.id] }),
    address: one(addresses, { fields: [stores.addressId], references: [addresses.id] }),
    products: many(products),
    vouchers: many(vouchers),
    orders: many(orders),
    conversations: many(conversations),
}))

// Catalog Relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
    products: many(products),
    parent: one(categories, {
        fields: [categories.parentId],
        references: [categories.id],
        relationName: "category_parent",
    }),
    children: many(categories, {
        relationName: "category_parent",
    }),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
    store: one(stores, { fields: [products.storeId], references: [stores.id] }),
    category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
    images: many(productImages),
    cartItems: many(cartItems),
    orderItems: many(orderItems),
}))

export const productImagesRelations = relations(productImages, ({ one }) => ({
    product: one(products, { fields: [productImages.productId], references: [products.id] }),
}))

// Cart Relations
export const cartsRelations = relations(carts, ({ one, many }) => ({
    user: one(user, { fields: [carts.userId], references: [user.id] }),
    items: many(cartItems),
}))

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
    cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
    product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}))

// Transaction Relations
export const vouchersRelations = relations(vouchers, ({ one }) => ({
    store: one(stores, { fields: [vouchers.storeId], references: [stores.id] }),
}))

export const paymentsRelations = relations(payments, ({ one, many }) => ({
    user: one(user, { fields: [payments.userId], references: [user.id] }),
    orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
    payment: one(payments, { fields: [orders.paymentId], references: [payments.id] }),
    store: one(stores, { fields: [orders.storeId], references: [stores.id] }),
    user: one(user, { fields: [orders.userId], references: [user.id] }),
    items: many(orderItems),
    shipment: one(shipments),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
    product: one(products, { fields: [orderItems.productId], references: [products.id] }),
    review: one(reviews),
}))

export const shipmentsRelations = relations(shipments, ({ one }) => ({
    order: one(orders, { fields: [shipments.orderId], references: [orders.id] }),
}))

export const reviewsRelations = relations(reviews, ({ one }) => ({
    orderItem: one(orderItems, { fields: [reviews.orderItemId], references: [orderItems.id] }),
    user: one(user, { fields: [reviews.userId], references: [user.id] }),
}))

// Chat Relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
    buyer: one(user, { fields: [conversations.buyerId], references: [user.id] }),
    store: one(stores, { fields: [conversations.storeId], references: [stores.id] }),
    messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
    sender: one(user, { fields: [messages.senderId], references: [user.id] }),
}))