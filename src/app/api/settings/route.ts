import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Define the settings table name
const SETTINGS_TABLE = 'settings';

// Default settings to use when no settings exist
const DEFAULT_SETTINGS = {
  company_name: 'Go On Riders',
  contact_email: '',
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
};

/**
 * Get current system settings
 */
async function getSettings(request: AuthenticatedRequest) {
  try {
    console.log('Fetching settings...');
    
    // Try to get existing settings
    const { data: existingSettings, error } = await supabase
      .from(SETTINGS_TABLE)
      .select('*')
      .limit(1)
      .single();
    
    // If settings don't exist or there's an error, create default settings
    if (error || !existingSettings) {
      console.log('No settings found, creating default settings...');
      
      try {
        // Insert default settings
        const { data: newSettings, error: insertError } = await supabase
          .from(SETTINGS_TABLE)
          .insert({
            company_name: DEFAULT_SETTINGS.company_name,
            contact_email: DEFAULT_SETTINGS.contact_email,
            contact_phone: DEFAULT_SETTINGS.contact_phone,
            address: DEFAULT_SETTINGS.address,
            city: DEFAULT_SETTINGS.city,
            state: DEFAULT_SETTINGS.state,
            pincode: DEFAULT_SETTINGS.pincode,
            gst_number: DEFAULT_SETTINGS.gst_number,
            booking_settings: DEFAULT_SETTINGS.booking_settings,
            notification_settings: DEFAULT_SETTINGS.notification_settings
          })
          .select()
          .single();
          
        if (insertError) {
          console.error('Error creating default settings:', insertError);
          // Return default settings from memory even if DB insert fails
          return NextResponse.json({
            success: true,
            settings: DEFAULT_SETTINGS
          });
        }
        
        return NextResponse.json({
          success: true,
          settings: newSettings
        });
      } catch (createError) {
        console.error('Exception creating default settings:', createError);
        // Return default settings from memory as fallback
        return NextResponse.json({
          success: true,
          settings: DEFAULT_SETTINGS
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      settings: existingSettings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Return default settings even if there's an error
    return NextResponse.json({
      success: true,
      settings: DEFAULT_SETTINGS,
      error: 'Using default settings due to error'
    });
  }
}

/**
 * Update system settings
 */
async function updateSettings(request: AuthenticatedRequest) {
  try {
    // Verify that the user is an admin
    if (request.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Check if we have existing settings first
    const { data: existingSettings, error: checkError } = await supabase
      .from(SETTINGS_TABLE)
      .select('id')
      .limit(1)
      .single();
      
    let operation;
    
    if (checkError || !existingSettings) {
      // If no settings exist, insert
      operation = supabase
        .from(SETTINGS_TABLE)
        .insert(body);
    } else {
      // Otherwise update existing settings
      operation = supabase
        .from(SETTINGS_TABLE)
        .update(body)
        .eq('id', existingSettings.id);
    }
    
    const { error } = await operation;
    
    if (error) {
      console.error('Error updating settings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update settings' },
        { status: 500 }
      );
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
        error: error instanceof Error ? error.message : 'Failed to update settings' 
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getSettings);
export const PUT = withAuth(updateSettings); 