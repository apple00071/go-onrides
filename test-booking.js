const fetch = require('node-fetch');

async function testAuthentication() {
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

    // Now create a booking with the authentication token
    const bookingResponse = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': tokenCookie
      },
      body: JSON.stringify({
        customer_details: {
          first_name: 'Test',
          last_name: 'Customer',
          phone: '9876123400',
          email: 'test@example.com'
        },
        vehicle_id: 1,
        pricing: {
          base_price: 1000,
          security_deposit: 500,
          total_amount: 1500
        },
        start_date: '2023-06-01',
        end_date: '2023-06-05'
      })
    });

    const bookingData = await bookingResponse.json();
    console.log('Booking creation response status:', bookingResponse.status);
    console.log('Booking creation response body:', JSON.stringify(bookingData, null, 2));
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testAuthentication(); 