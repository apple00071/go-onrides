import mongoose from 'mongoose';

export interface IVehicle {
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  vin: string;
  color: string;
  type: 'car' | 'motorcycle' | 'van' | 'truck';
  transmission: 'manual' | 'automatic';
  fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  mileage: number;
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  insuranceInfo: {
    provider: string;
    policyNumber: string;
    expiryDate: Date;
  };
  maintenanceHistory: Array<{
    date: Date;
    type: 'routine' | 'repair' | 'inspection';
    description: string;
    cost: number;
    mileage: number;
  }>;
  features: string[];
  images: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new mongoose.Schema<IVehicle>({
  make: {
    type: String,
    required: true,
    trim: true,
  },
  model: {
    type: String,
    required: true,
    trim: true,
  },
  year: {
    type: Number,
    required: true,
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  vin: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  color: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['car', 'motorcycle', 'van', 'truck'],
    required: true,
  },
  transmission: {
    type: String,
    enum: ['manual', 'automatic'],
    required: true,
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'electric', 'hybrid'],
    required: true,
  },
  mileage: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['available', 'rented', 'maintenance', 'retired'],
    default: 'available',
  },
  dailyRate: {
    type: Number,
    required: true,
    min: 0,
  },
  weeklyRate: {
    type: Number,
    required: true,
    min: 0,
  },
  monthlyRate: {
    type: Number,
    required: true,
    min: 0,
  },
  insuranceInfo: {
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    policyNumber: {
      type: String,
      required: true,
      trim: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
  },
  maintenanceHistory: [{
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ['routine', 'repair', 'inspection'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    mileage: {
      type: Number,
      required: true,
      min: 0,
    },
  }],
  features: [{
    type: String,
    trim: true,
  }],
  images: [{
    type: String,
    trim: true,
  }],
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Add indexes for frequently queried fields
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ type: 1 });
vehicleSchema.index({ registrationNumber: 1 });
vehicleSchema.index({ vin: 1 });
vehicleSchema.index({ make: 1, model: 1 });
vehicleSchema.index({ dailyRate: 1 });

// Add any static methods here
vehicleSchema.statics.findAvailable = function() {
  return this.find({ status: 'available' });
};

vehicleSchema.statics.findByRegistration = function(registrationNumber: string) {
  return this.findOne({ registrationNumber: registrationNumber.toUpperCase() });
};

const Vehicle = mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', vehicleSchema);

export default Vehicle; 