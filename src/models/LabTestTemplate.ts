import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILabTestParameter {
  parameterId: string;
  name: string;
  section?: string;
  unit?: string;
  referenceRange?: string;
  maleRange?: string;
  femaleRange?: string;
  inputType: "NUMBER" | "TEXT" | "SELECT" | "HEADING";
  options?: string[];
  defaultValue?: string;
  displayOrder: number;
  isRequired?: boolean;
}

export interface ILabTestTemplate extends Document {
  code: string;
  name: string;
  category: string;
  sampleType?: string;
  description?: string;
  sections?: string[];
  parameters: ILabTestParameter[];
  defaultRemarks?: string;
  interpretationNotes?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LabTestParameterSchema = new Schema<ILabTestParameter>({
  parameterId: { type: String, required: true },
  name: { type: String, required: true },
  section: { type: String },
  unit: { type: String },
  referenceRange: { type: String },
  maleRange: { type: String },
  femaleRange: { type: String },
  inputType: { type: String, default: "TEXT", enum: ["NUMBER", "TEXT", "SELECT", "HEADING"] },
  options: [{ type: String }],
  defaultValue: { type: String },
  displayOrder: { type: Number, default: 0 },
  isRequired: { type: Boolean, default: false },
});

const LabTestTemplateSchema: Schema<ILabTestTemplate> = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, default: "General Pathology" },
    sampleType: { type: String },
    description: { type: String },
    sections: [{ type: String }],
    parameters: [LabTestParameterSchema],
    defaultRemarks: { type: String },
    interpretationNotes: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String },
  },
  { timestamps: true }
);

export const LabTestTemplateModel: Model<ILabTestTemplate> =
  mongoose.models.LabTestTemplate || mongoose.model<ILabTestTemplate>("LabTestTemplate", LabTestTemplateSchema);
