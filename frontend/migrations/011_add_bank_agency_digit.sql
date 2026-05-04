-- Migration: Add bank_agency_digit column to users table
-- Date: 2026-05-04
-- Description: Some banks require agency digit (branch check digit) for Pagar.me integration

-- Add bank_agency_digit column
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_agency_digit VARCHAR(2);

-- Add comment
COMMENT ON COLUMN users.bank_agency_digit IS 'Dígito verificador da agência bancária';
