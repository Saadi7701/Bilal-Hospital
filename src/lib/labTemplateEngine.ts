import { DEFAULT_LAB_TEMPLATES, LabTemplateDef, LabTemplateParamDef } from "./labTemplateRegistry";

export type ResultFlag = "NORMAL" | "HIGH" | "LOW" | "CRITICAL" | "ABNORMAL";

export interface EvaluatedParameterResult {
  parameterId: string;
  name: string;
  section?: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag: ResultFlag;
}

export class LabTemplateEngine {
  /**
   * Retrieves a template by code from DB or default registry.
   */
  public async getTemplate(code: string): Promise<LabTemplateDef | null> {
    const cleanCode = code.trim().toUpperCase();

    if (typeof window === "undefined") {
      try {
        const { prisma } = await import("./prisma");
        const dbTemplate = await prisma.labTestTemplate.findFirst({
          where: { code: cleanCode, isActive: true },
        });
        if (dbTemplate) {
          const parsedParams = dbTemplate.parameters ? JSON.parse(dbTemplate.parameters) : [];
          const parsedSections = dbTemplate.sections ? JSON.parse(dbTemplate.sections) : [];
          return {
            code: dbTemplate.code,
            name: dbTemplate.name,
            category: dbTemplate.category,
            sampleType: dbTemplate.sampleType || "Sample",
            description: dbTemplate.description || "",
            sections: parsedSections,
            parameters: parsedParams,
            defaultRemarks: dbTemplate.defaultRemarks || undefined,
            interpretationNotes: dbTemplate.interpretationNotes || undefined,
          };
        }
      } catch (err) {
        console.warn("[LabTemplateEngine] PostgreSQL fetch fallback:", err);
      }
    }

    const defaultMatch = DEFAULT_LAB_TEMPLATES.find((t) => t.code === cleanCode || cleanCode.includes(t.code));
    return defaultMatch || null;
  }

  /**
   * Evaluates a parameter's entered value against its reference range.
   */
  public evaluateResultValue(param: LabTemplateParamDef, valStr: string): ResultFlag {
    if (!valStr || valStr.trim() === "" || param.inputType === "HEADING") {
      return "NORMAL";
    }

    const trimmed = valStr.trim();
    if (trimmed.toLowerCase() === "positive" || trimmed.toLowerCase() === "reactive" || trimmed.includes("Positive")) {
      return "ABNORMAL";
    }

    if (!param.referenceRange) return "NORMAL";

    const numVal = parseFloat(trimmed.replace(/,/g, ""));
    if (isNaN(numVal)) return "NORMAL";

    // Range patterns: "12.0 - 16.5" or "130 - 200"
    const rangeMatch = param.referenceRange.match(/([\d\.]+)\s*-\s*([\d\.]+)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);

      if (numVal < min) return "LOW";
      if (numVal > max) return "HIGH";
      return "NORMAL";
    }

    // Pattern: "< 150" or "Up to 150"
    const maxMatch = param.referenceRange.match(/(?:<|Up to)\s*([\d\.]+)/i);
    if (maxMatch) {
      const max = parseFloat(maxMatch[1]);
      if (numVal > max) return "HIGH";
      return "NORMAL";
    }

    return "NORMAL";
  }

  /**
   * Evaluates all results for a given lab test template and produces flagged results.
   */
  public evaluateAllResults(
    template: LabTemplateDef,
    enteredResults: Record<string, string>
  ): EvaluatedParameterResult[] {
    const evaluated: EvaluatedParameterResult[] = [];

    for (const param of template.parameters) {
      if (param.inputType === "HEADING") continue;
      const rawVal = enteredResults[param.parameterId] || param.defaultValue || "";
      const flag = this.evaluateResultValue(param, rawVal);

      evaluated.push({
        parameterId: param.parameterId,
        name: param.name,
        section: param.section,
        value: rawVal,
        unit: param.unit,
        referenceRange: param.referenceRange,
        flag,
      });
    }

    return evaluated;
  }
}

export const labTemplateEngine = new LabTemplateEngine();
