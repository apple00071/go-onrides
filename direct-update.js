const { createClient } = require('@supabase/supabase-js');

// Create a new Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sggrtzrmjkbrxnztzveu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZ3J0enJtamticnhuenR6dmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTc4MTQyNjQsImV4cCI6MjAxMzM5MDI2NH0.lVToRTGO99ECuPKbY7XRF-vEjRlAH4bP5Zs0SuZw1GE';

// Initialize the client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectUpdate() {
  try {
    console.log('Testing direct SQL update...');
    
    const bookingId = 45; // The booking ID to update
    const documentData = { 
      test_doc: 'direct SQL test', 
      timestamp: new Date().toISOString() 
    };
    const signatureData = 'direct-sql-signature-' + new Date().toISOString();
    
    console.log(`Updating booking ${bookingId} with documents and signature...`);
    
    // First, ensure the columns exist
    try {
      const { data: columnResult, error: columnError } = await supabase.rpc('execute_sql', {
        sql_string: `
          DO $$
          BEGIN
            -- Check and add documents column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'documents'
            ) THEN
              ALTER TABLE bookings ADD COLUMN documents JSONB;
              RAISE NOTICE 'Added missing documents column to bookings table';
            END IF;
            
            -- Check and add signature column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'bookings' AND column_name = 'signature'
            ) THEN
              ALTER TABLE bookings ADD COLUMN signature TEXT;
              RAISE NOTICE 'Added missing signature column to bookings table';
            END IF;
          END $$;
        `
      });
      
      if (columnError) {
        console.error('Error ensuring columns exist:', columnError);
      } else {
        console.log('Columns check completed successfully');
      }
    } catch (columnError) {
      console.error('Exception when ensuring columns exist:', columnError);
    }
    
    // Then do a simple direct update using standard SQL
    try {
      const { data: updateResult, error: updateError } = await supabase.rpc('execute_sql', {
        sql_string: `
          UPDATE bookings 
          SET 
            signature = '${signatureData}',
            documents = '${JSON.stringify(documentData)}'::jsonb
          WHERE id = ${bookingId};
        `
      });
      
      if (updateError) {
        console.error('Error with direct SQL update:', updateError);
      } else {
        console.log('Update completed successfully:', updateResult);
      }
    } catch (updateError) {
      console.error('Exception when updating booking:', updateError);
    }
    
    // Finally, check if the update worked
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('id, documents, signature')
        .eq('id', bookingId)
        .single();
        
      if (error) {
        console.error('Error fetching updated booking:', error);
      } else {
        console.log('Updated booking data:', booking);
        console.log('Documents updated:', !!booking.documents);
        console.log('Signature updated:', !!booking.signature);
        
        if (booking.documents) {
          console.log('Document data:', booking.documents);
        }
        
        if (booking.signature) {
          console.log('Signature data:', booking.signature);
        }
      }
    } catch (queryError) {
      console.error('Exception when fetching updated booking:', queryError);
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testDirectUpdate(); 