const fetch = require('node-fetch');

async function testBookingEndpoint() {
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

    console.log('Token cookie received, now testing test-booking endpoint...');
    
    // Use the vehicle ID we know exists from our previous test
    const vehicleId = 19;

    // Create booking with our test endpoint
    const bookingData = {
      customer_details: {
        first_name: 'Test',
        last_name: 'Customer',
        phone: '9876543210',
        email: 'test@example.com'
      },
      vehicle_id: vehicleId,
      pricing: {
        base_price: 1000,
        security_deposit: 500,
        total_amount: 1500
      },
      start_date: '2023-06-01',
      end_date: '2023-06-05'
    };

    console.log('Sending booking data to test endpoint:', JSON.stringify(bookingData, null, 2));

    const bookingResponse = await fetch('http://localhost:3000/api/test-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': tokenCookie
      },
      body: JSON.stringify(bookingData)
    });

    if (bookingResponse.ok) {
      const data = await bookingResponse.json();
      console.log('Test booking successful:', data);
    } else {
      const errorData = await bookingResponse.json();
      console.error('Test booking failed with status:', bookingResponse.status);
      console.error('Error details:', errorData);
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testBookingEndpoint(); 