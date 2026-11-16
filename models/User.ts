import "server-only";
import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface UserRecord {
  name: string;
  /** Always stored lowercase and trimmed. */
  email: string;
  /**
   * bcrypt hash; the password itself is never stored. Never selected unless
   * asked for. Optional only because accounts made by the old Google sign-in
   * have none (they can't sign in with a password).
   */
  passwordHash?: string;
  /** Profile picture on Cloudinary (under the user's avatar folder). */
  avatarUrl?: string;
  avatarPublicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, select: false },
    avatarUrl: { type: String },
    avatarPublicId: { type: String },
  },
  {
    timestamps: true,
    // Belt and braces: even if a query selects it, the hash never serializes.
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as Partial<UserRecord>).passwordHash;
        return ret;
      },
    },
  },
);

export type UserDocument = HydratedDocument<UserRecord>;

export const User: Model<UserRecord> =
  (mongoose.models.User as Model<UserRecord> | undefined) ?? mongoose.model<UserRecord>("User", UserSchema);
