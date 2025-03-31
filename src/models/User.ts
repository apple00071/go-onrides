import mongoose from 'mongoose';

export interface IUser {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'worker';
  status: 'active' | 'inactive';
  phone?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'worker'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  phone: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLoginAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Add any instance methods here
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Add any static methods here
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User; 