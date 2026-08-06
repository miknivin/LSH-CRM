import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISource extends Document {
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const sourceSchema = new Schema<ISource>(
  {
    title: {
      type: String,
      required: [true, "Source title is required"],
      trim: true,
      unique: true,
      maxLength: [100, "Source title cannot exceed 100 characters"],
    },
  },
  { timestamps: true }
);

const Source: Model<ISource> = mongoose.models.Source ?? mongoose.model<ISource>("Source", sourceSchema);

export default Source;
