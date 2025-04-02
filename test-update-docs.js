const fetch = require('node-fetch');

async function testUpdateDocsAndSignature() {
  try {
    // First, login to get authentication token
    console.log('Attempting to login with demo credentials...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'demo',
        password: 'demo123'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      console.error('Login failed:', error);
      throw new Error('Authentication failed');
    }

    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);

    // Extract the cookie from the response
    const cookies = loginResponse.headers.raw()['set-cookie'];
    const tokenCookie = cookies ? cookies[0] : null;
    
    if (!tokenCookie) {
      throw new Error('No authentication token received');
    }

    console.log('Token cookie received, now testing document and signature updates...');
    
    // Use a booking ID that we know exists from previous tests
    const bookingId = 45; // Update this with a valid booking ID from your tests
    
    // Define document and signature data for testing
    const documentData = {
      test_doc: 'test document data',
      updated_at: new Date().toISOString()
    };
    
    const signatureData = 'test-signature-data-' + new Date().toISOString();
    
    console.log(`Updating booking ${bookingId} with new documents and signature...`);
    console.log('Document data:', documentData);
    console.log('Signature data:', signatureData);
    
    // First check if the booking exists and what columns it has
    const checkResponse = await fetch(`http://localhost:3000/api/bookings/${bookingId}`, {
      method: 'GET',
      headers: {
        'Cookie': tokenCookie
      }
    });
    
    if (!checkResponse.ok) {
      console.error(`Booking ${bookingId} not found. Status:`, checkResponse.status);
      throw new Error(`Booking ${bookingId} not found`);
    }
    
    const bookingData = await checkResponse.json();
    console.log('Current booking data:', JSON.stringify(bookingData, null, 2));
    
    // Now update the booking with documents and signature
    const updateResponse = await fetch(`http://localhost:3000/api/bookings/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': tokenCookie
      },
      body: JSON.stringify({
        documents: documentData,
        signature: signatureData
      })
    });
    
    if (!updateResponse.ok) {
      console.error('Update failed with status:', updateResponse.status);
      const updateError = await updateResponse.json();
      console.error('Update error details:', updateError);
      throw new Error('Failed to update booking');
    }
    
    const updateResult = await updateResponse.json();
    console.log('Update result:', JSON.stringify(updateResult, null, 2));
    
    // Check if the update was successful by retrieving the booking again
    const verifyResponse = await fetch(`http://localhost:3000/api/bookings/${bookingId}`, {
      method: 'GET',
      headers: {
        'Cookie': tokenCookie
      }
    });
    
    const verifiedBooking = await verifyResponse.json();
    console.log('Verified booking after update:', JSON.stringify(verifiedBooking, null, 2));
    
    // Check if documents and signature were saved
    if (verifiedBooking.booking) {
      console.log('Documents saved:', verifiedBooking.booking.documents ? 'YES' : 'NO');
      console.log('Signature saved:', verifiedBooking.booking.signature ? 'YES' : 'NO');
      
      if (verifiedBooking.booking.documents) {
        console.log('Saved document data:', verifiedBooking.booking.documents);
      }
      
      if (verifiedBooking.booking.signature) {
        console.log('Saved signature data:', verifiedBooking.booking.signature);
      }
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testUpdateDocsAndSignature(); 