const fetch = require('node-fetch');

async function testServerStatus() {
  try {
    // Check if the server is responsive by trying the login endpoint
    console.log('Testing server status...');
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'demo',
        password: 'demo123'
      })
    });

    const data = await response.json();
    console.log('Server is responsive. Status code:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    // Check if the server can respond to a simple GET request
    console.log('\nTesting a GET endpoint...');
    const vehiclesResponse = await fetch('http://localhost:3000/api/vehicles');
    if (vehiclesResponse.ok) {
      const vehiclesData = await vehiclesResponse.json();
      console.log('Vehicles API is responsive. Status code:', vehiclesResponse.status);
      console.log('First few vehicles:', vehiclesData.vehicles.slice(0, 2));
    } else {
      console.log('Vehicles API returned status:', vehiclesResponse.status);
    }
    
  } catch (error) {
    console.error('Error testing server:', error);
  }
}

testServerStatus(); 