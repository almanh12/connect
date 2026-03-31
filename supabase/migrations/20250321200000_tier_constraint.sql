-- Tier column: enforce lowercase values and set default
-- Valid tiers: bronze, silver, gold, platinum, diamond

-- Update existing data to lowercase (in case any are Title Case)
UPDATE profiles SET tier = LOWER(tier) WHERE tier IS NOT NULL AND tier != LOWER(tier);

-- Set default to lowercase
ALTER TABLE profiles ALTER COLUMN tier SET DEFAULT 'bronze';

-- Add CHECK constraint for valid tier values
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_tier_check
  CHECK (tier IS NULL OR tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond'));
