import { NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Define the setting interface
interface Setting {
  key: string;
  value: string;
  type: string;
  category: string;
  label?: string;
  description?: string;
}

// Get application settings
async function getSettings(request: AuthenticatedRequest) {
  try {
    // Get settings from Supabase
    const { data: settings, error } = await supabase
      .from(TABLES.SETTINGS)
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching settings:', error);
      // If no settings found, return default settings
      return NextResponse.json({
        success: true,
        settings: {
          company_name: 'Go On Riders',
          contact_email: 'contact@goonriders.com',
          contact_phone: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          gst_number: '',
          booking_settings: {
            min_booking_duration: 1,
            max_booking_duration: 30,
            advance_booking_days: 30,
            cancellation_period: 24,
            late_return_fee: 500
          },
          notification_settings: {
            email_notifications: true,
            sms_notifications: true,
            booking_confirmation: true,
            booking_reminder: true,
            payment_reminder: true,
            return_reminder: true
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error in settings endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch settings'
      },
      { status: 500 }
    );
  }
}

// Update application settings
async function updateSettings(request: AuthenticatedRequest) {
  try {
    const settings = await request.json();

    const { error } = await supabase
      .from(TABLES.SETTINGS)
      .upsert(settings, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update settings'
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getSettings);
export const POST = withAuth(updateSettings); 