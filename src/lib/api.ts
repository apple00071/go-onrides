import { cookies } from "next/headers";

export async function fetchCustomerDetails(id: string) {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customers/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch customer details");
  }

  return response.json();
}

export async function fetchUserDetails(id: string) {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user details");
  }

  return response.json();
}

export async function fetchReport(id: string) {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch report");
  }

  return response.json();
} 