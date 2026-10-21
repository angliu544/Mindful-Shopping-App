import "server-only";
import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface UserRecord {
  name: string;
  /** Always stored lowercase and trimmed. */
  email: string;
  /** bcrypt hash. Absent for Google-only users. Never selected unless asked for. */
  passwordHash?: string;
  image?: string;
  /** Google's stable account id (`sub`), for users who sign in with Google. */
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, select: false },
    image: { type: String },
    googleId: { type: String, unique: true, sparse: true },
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
