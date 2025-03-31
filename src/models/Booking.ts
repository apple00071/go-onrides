import mongoose from 'mongoose';
import { ICustomer } from './Customer';
import { IVehicle } from './Vehicle';
import { IUser } from './User';

export interface IBooking {
  customer: mongoose.Types.ObjectId | ICustomer;
  vehicle: mongoose.Types.ObjectId | IVehicle;
  worker: mongoose.Types.ObjectId | IUser;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  pickupLocation: string;
  dropoffLocation: string;
  mileageStart?: number;
  mileageEnd?: number;
  rate: {
    type: 'daily' | 'weekly' | 'monthly';
    amount: number;
  };
  totalAmount: number;
  deposit: number;
  payment: {
    status: 'pending' | 'partial' | 'paid';
    amountPaid: number;
    method: 'cash' | 'card' | 'bank_transfer';
    transactions: Array<{
      date: Date;
      amount: number;
      method: 'cash' | 'card' | 'bank_transfer';
      reference?: string;
    }>;
  };
  documents: Array<{
    type: 'contract' | 'id' | 'license' | 'insurance' | 'other';
    url: string;
    name: string;
    uploadedAt: Date;
  }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new mongoose.Schema<IBooking>({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending',
  },
  pickupLocation: {
    type: String,
    required: true,
    trim: true,
  },
  dropoffLocation: {
    type: String,
    required: true,
    trim: true,
  },
  mileageStart: {
    type: Number,
    min: 0,
  },
  mileageEnd: {
    type: Number,
    min: 0,
  },
  rate: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  deposit: {
    type: Number,
    required: true,
    min: 0,
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    method: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer'],
    },
    transactions: [{
      date: {
        type: Date,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      method: {
        type: String,
        enum: ['cash', 'card', 'bank_transfer'],
        required: true,
      },
      reference: {
        type: String,
        trim: true,
      },
    }],
  },
  documents: [{
    type: {
      type: String,
      enum: ['contract', 'id', 'license', 'insurance', 'other'],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Add indexes for frequently queried fields
bookingSchema.index({ customer: 1 });
bookingSchema.index({ vehicle: 1 });
bookingSchema.index({ worker: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ startDate: 1, endDate: 1 });
bookingSchema.index({ 'payment.status': 1 });

// Add any static methods here
bookingSchema.statics.findActiveBookings = function() {
  return this.find({ status: 'active' })
    .populate('customer')
    .populate('vehicle')
    .populate('worker');
};

bookingSchema.statics.findBookingsByCustomer = function(customerId: string) {
  return this.find({ customer: customerId })
    .populate('vehicle')
    .populate('worker')
    .sort({ startDate: -1 });
};

bookingSchema.statics.findBookingsByVehicle = function(vehicleId: string) {
  return this.find({ vehicle: vehicleId })
    .populate('customer')
    .populate('worker')
    .sort({ startDate: -1 });
};

const Booking = mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking; 