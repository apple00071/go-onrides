const fetch = require('node-fetch');

async function testBookingWithDocs() {
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

    console.log('Token cookie received, now creating a booking with documents...');

    // Define document and signature data for testing
    const documentData = {
      dl_front: 'data:image/png;base64,iVBORw0KGgoAA',
      dl_back: 'data:image/png;base64,iVBORw0KGgoAA'
    };
    
    const signatureData = 'data:image/png;base64,iVBORw0KGgoAA';
    
    console.log('Document data being sent:', documentData);
    console.log('Signature data being sent:', signatureData);

    // Now create a booking with document and signature data
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
          phone: '9876543211',
          email: 'doctest@example.com'
        },
        vehicle_id: 20,
        pricing: {
          base_price: 1000,
          security_deposit: 500,
          total_amount: 1500
        },
        start_date: '2023-07-01',
        end_date: '2023-07-05',
        // Include document data as JSON
        documents: documentData,
        // Include signature data
        signature: signatureData
      })
    });

    const bookingData = await bookingResponse.json();
    console.log('Booking creation response status:', bookingResponse.status);
    console.log('Booking creation response body:', JSON.stringify(bookingData, null, 2));
    
    // If successful, try to retrieve the booking to verify documents were saved
    if (bookingResponse.ok && bookingData.booking && bookingData.booking.id) {
      console.log('Now retrieving the booking to verify document data...');
      
      const getBookingResponse = await fetch(`http://localhost:3000/api/bookings/${bookingData.booking.id}`, {
        method: 'GET',
        headers: {
          'Cookie': tokenCookie
        }
      });
      
      if (getBookingResponse.ok) {
        const retrievedBooking = await getBookingResponse.json();
        console.log('Retrieved booking:', JSON.stringify(retrievedBooking, null, 2));
        
        // Check if documents and signature were saved
        if (retrievedBooking.booking) {
          console.log('Documents saved:', !!retrievedBooking.booking.documents);
          console.log('Signature saved:', !!retrievedBooking.booking.signature);
        }
      } else {
        console.error('Failed to retrieve booking:', getBookingResponse.status);
      }
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testBookingWithDocs(); 