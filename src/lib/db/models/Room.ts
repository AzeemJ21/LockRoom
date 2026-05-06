import mongoose, { Schema, type Document } from 'mongoose';

export interface IRoom extends Document {
  code: string;
  createdAt: Date;
  lastActivity: Date;
  participantCount: number;
  isActive: boolean;
}

const RoomSchema = new Schema<IRoom>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      match: /^[A-Z0-9]{6,10}$/,
    },
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    participantCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { collection: 'rooms' }
);

RoomSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 3600 });
RoomSchema.index({ code: 1 });

export const Room =
  (mongoose.models.Room as mongoose.Model<IRoom>) ||
  mongoose.model<IRoom>('Room', RoomSchema);
