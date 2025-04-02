-- Add documents and signature columns to the bookings table if they don't exist
DO $$
BEGIN
  -- Check and add documents column if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'documents'
  ) THEN
    ALTER TABLE bookings ADD COLUMN documents JSONB;
    RAISE NOTICE 'Added documents column to bookings table';
  ELSE
    RAISE NOTICE 'Documents column already exists';
  END IF;
  
  -- Check and add signature column if missing
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'signature'
  ) THEN
    ALTER TABLE bookings ADD COLUMN signature TEXT;
    RAISE NOTICE 'Added signature column to bookings table';
  ELSE
    RAISE NOTICE 'Signature column already exists';
  END IF;
END $$; 