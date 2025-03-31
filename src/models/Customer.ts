import mongoose from 'mongoose';

export interface ICustomer {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  idType: 'passport' | 'national_id' | 'drivers_license';
  idNumber: string;
  idExpiryDate: Date;
  driversLicenseNumber: string;
  driversLicenseExpiryDate: Date;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  status: 'active' | 'blacklisted' | 'inactive';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new mongoose.Schema<ICustomer>({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  zipCode: {
    type: String,
    required: true,
    trim: true,
  },
  idType: {
    type: String,
    enum: ['passport', 'national_id', 'drivers_license'],
    required: true,
  },
  idNumber: {
    type: String,
    required: true,
    trim: true,
  },
  idExpiryDate: {
    type: Date,
    required: true,
  },
  driversLicenseNumber: {
    type: String,
    required: true,
    trim: true,
  },
  driversLicenseExpiryDate: {
    type: Date,
    required: true,
  },
  emergencyContact: {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
  },
  status: {
    type: String,
    enum: ['active', 'blacklisted', 'inactive'],
    default: 'active',
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Add indexes for frequently queried fields
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ idNumber: 1 });
customerSchema.index({ driversLicenseNumber: 1 });
customerSchema.index({ status: 1 });

// Add any static methods here
customerSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

customerSchema.statics.findByPhone = function(phone: string) {
  return this.findOne({ phone });
};

const Customer = mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer; 