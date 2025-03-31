export async function fetchCustomerDetails(id: string) {
  const response = await fetch(`/api/customers/${id}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error("Failed to fetch customer details");
  }

  return response.json();
}

export async function fetchUserDetails(id: string) {
  const response = await fetch(`/api/users/${id}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user details");
  }

  return response.json();
}

export async function fetchReport(id: string) {
  const response = await fetch(`/api/reports/${id}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error("Failed to fetch report");
  }

  return response.json();
} 