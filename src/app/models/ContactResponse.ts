import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type ContactResponseActivity =
  | "HAD_CONVERSATION"
  | "CALLED_NOT_PICKED"
  | "CALLED_INVALID"
  | "CALLED_SWITCHED_OFF"
  | "WHATSAPP_COMMUNICATED"
  | "ONLINE_MEETING_SCHEDULED"
  | "OFFLINE_MEETING_SCHEDULED"
  | "ONLINE_MEETING_CONFIRMED"
  | "OFFLINE_MEETING_CONFIRMED"
  | "PROPOSAL_SHARED"
  | "PAYMENT_DONE_ADVANCE"
  | "PAYMENT_DONE_PENDING"
  | "FULL_PAYMENT_DONE"
  | "PAYMENT_DONE_MONTHLY"
  | "OTHER";

export const contactResponseActivities: ContactResponseActivity[] = [
  "HAD_CONVERSATION",
  "CALLED_NOT_PICKED",
  "CALLED_INVALID",
  "CALLED_SWITCHED_OFF",
  "WHATSAPP_COMMUNICATED",
  "ONLINE_MEETING_SCHEDULED",
  "OFFLINE_MEETING_SCHEDULED",
  "ONLINE_MEETING_CONFIRMED",
  "OFFLINE_MEETING_CONFIRMED",
  "PROPOSAL_SHARED",
  "PAYMENT_DONE_ADVANCE",
  "PAYMENT_DONE_PENDING",
  "FULL_PAYMENT_DONE",
  "PAYMENT_DONE_MONTHLY",
  "OTHER",
];

export const meetingContactResponseActivities: ContactResponseActivity[] = [
  "ONLINE_MEETING_SCHEDULED",
  "OFFLINE_MEETING_SCHEDULED",
  "ONLINE_MEETING_CONFIRMED",
  "OFFLINE_MEETING_CONFIRMED",
];

export interface IContactResponse extends Document {
  contact: Types.ObjectId;
  activity: ContactResponseActivity;
  note?: string;
  meetingScheduledDate?: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContactResponseSchema = new Schema<IContactResponse>(
  {
    contact: {
      type: Schema.Types.ObjectId,
      ref: "Contact",
      required: [true, "Contact ID is required"],
    },
    activity: {
      type: String,
      required: [true, "Activity type is required"],
      enum: contactResponseActivities,
    },
    note: {
      type: String,
      trim: true,
      maxLength: [1000, "Note cannot exceed 1000 characters"],
      default: "",
    },
    meetingScheduledDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required"],
    },
  },
  { timestamps: true, collection: "contactresponses" }
);

ContactResponseSchema.index({ contact: 1, createdAt: -1 });
ContactResponseSchema.index({ activity: 1 });

const ContactResponse: Model<IContactResponse> =
  mongoose.models.ContactResponse ?? mongoose.model<IContactResponse>("ContactResponse", ContactResponseSchema);

export default ContactResponse;
