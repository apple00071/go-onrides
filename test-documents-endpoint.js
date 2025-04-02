const fetch = require('node-fetch');

async function testDocumentsEndpoint() {
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

    console.log('Token cookie received, now creating a booking...');

    // 1. First create a booking without documents/signature
    const bookingResponse = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': tokenCookie
      },
      body: JSON.stringify({
        customer_details: {
          first_name: 'Doc',
          last_name: 'Test',
          phone: '9876543212',
          email: 'doctest2@example.com'
        },
        vehicle_id: 19,
        pricing: {
          base_price: 1200,
          security_deposit: 600,
          total_amount: 1800
        },
        start_date: '2023-07-10',
        end_date: '2023-07-15'
      })
    });

    const bookingData = await bookingResponse.json();
    console.log('Booking creation response status:', bookingResponse.status);
    
    if (!bookingResponse.ok || !bookingData.booking?.id) {
      console.error('Failed to create booking:', bookingData);
      throw new Error('Failed to create booking');
    }

    const bookingId = bookingData.booking.id;
    console.log(`Booking created successfully with ID: ${bookingId}`);
    
    // 2. Now update the booking with documents and signature using the dedicated endpoint
    console.log('Testing the documents endpoint...');
    
    const documentData = {
      dl_front: 'data:image/png;base64,iVBORw0KGgoAAAANEWTEST',
      dl_back: 'data:image/png;base64,iVBORw0KGgoNEWTEST'
    };
    
    const signatureData = 'data:image/png;base64,SIGNATURENEWTESTiVBORw0KGgoAA';
    
    const documentsResponse = await fetch(`http://localhost:3000/api/bookings/${bookingId}/documents`, {
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
    
    const documentsResult = await documentsResponse.json();
    console.log('Documents update response status:', documentsResponse.status);
    console.log('Documents update result:', JSON.stringify(documentsResult, null, 2));
    
    // 3. Verify the documents and signature were saved by retrieving the booking
    console.log('Verifying documents and signature were saved...');
    
    const verifyResponse = await fetch(`http://localhost:3000/api/bookings/${bookingId}`, {
      method: 'GET',
      headers: {
        'Cookie': tokenCookie
      }
    });
    
    const verifiedBooking = await verifyResponse.json();
    
    if (verifyResponse.ok && verifiedBooking.booking) {
      console.log('Booking data retrieved successfully');
      console.log('Documents saved:', verifiedBooking.booking.documents ? 'YES' : 'NO');
      console.log('Signature saved:', verifiedBooking.booking.signature ? 'YES' : 'NO');
      
      if (verifiedBooking.booking.documents) {
        console.log('Document keys:', Object.keys(verifiedBooking.booking.documents));
      }
      
      if (verifiedBooking.booking.signature) {
        console.log('Signature (first 20 chars):', verifiedBooking.booking.signature.substring(0, 20) + '...');
      }
    } else {
      console.error('Failed to retrieve booking:', verifiedBooking);
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testDocumentsEndpoint(); 