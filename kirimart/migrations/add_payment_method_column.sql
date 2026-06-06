-- Migration: Add payment_method column to orders table
-- This column distinguishes between online payment (Midtrans) and COD (Cash on Delivery)
-- Default: 'online' for backward compatibility with existing orders

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'online';

-- Verify
-- SELECT id, status, payment_method FROM orders LIMIT 5;
