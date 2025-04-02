-- Migration to add emergency contact columns to bookings table
DO $$ 
BEGIN
  -- Add father_phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'father_phone'
  ) THEN
    ALTER TABLE bookings ADD COLUMN father_phone TEXT;
    RAISE NOTICE 'Added father_phone column to bookings table';
  END IF;

  -- Add mother_phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'mother_phone'
  ) THEN
    ALTER TABLE bookings ADD COLUMN mother_phone TEXT;
    RAISE NOTICE 'Added mother_phone column to bookings table';
  END IF;

  -- Add emergency_contact1 column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'emergency_contact1'
  ) THEN
    ALTER TABLE bookings ADD COLUMN emergency_contact1 TEXT;
    RAISE NOTICE 'Added emergency_contact1 column to bookings table';
  END IF;

  -- Add emergency_contact2 column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'emergency_contact2'
  ) THEN
    ALTER TABLE bookings ADD COLUMN emergency_contact2 TEXT;
    RAISE NOTICE 'Added emergency_contact2 column to bookings table';
  END IF;
END $$; 