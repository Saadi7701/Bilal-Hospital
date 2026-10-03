import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LAB_TEMPLATES } from "@/lib/labTemplateRegistry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    let dbTemplates = await prisma.labTestTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    if (!dbTemplates || dbTemplates.length === 0) {
      console.log("[Lab Templates API] Seeding default templates into PostgreSQL...");
      for (const t of DEFAULT_LAB_TEMPLATES) {
        await prisma.labTestTemplate.create({
          data: {
            code: t.code,
            name: t.name,
            category: t.category,
            sampleType: t.sampleType,
            description: t.description,
            sections: t.sections ? JSON.stringify(t.sections) : null,
            parameters: JSON.stringify(t.parameters),
            defaultRemarks: t.defaultRemarks,
            interpretationNotes: t.interpretationNotes,
            isActive: true,
          },
        });
      }
      dbTemplates = await prisma.labTestTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
    }

    const templates = dbTemplates.map((t) => ({
      ...t,
      sections: t.sections ? JSON.parse(t.sections) : [],
      parameters: t.parameters ? JSON.parse(t.parameters) : [],
    }));

    return NextResponse.json({ templates }, { status: 200 });
  } catch (error: any) {
    console.error("[Lab Templates GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch lab templates: " + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.code || !body.name || !body.parameters) {
      return NextResponse.json({ error: "Template Code, Name, and Parameters are required." }, { status: 400 });
    }

    const cleanCode = body.code.toUpperCase().trim();
    const parametersStr = typeof body.parameters === "string" ? body.parameters : JSON.stringify(body.parameters);
    const sectionsStr = body.sections ? (typeof body.sections === "string" ? body.sections : JSON.stringify(body.sections)) : null;

    const existing = await prisma.labTestTemplate.findUnique({ where: { code: cleanCode } });
    if (existing) {
      const updated = await prisma.labTestTemplate.update({
        where: { code: cleanCode },
        data: {
          name: body.name,
          category: body.category || "General Pathology",
          sampleType: body.sampleType,
          description: body.description,
          sections: sectionsStr,
          parameters: parametersStr,
          defaultRemarks: body.defaultRemarks,
          interpretationNotes: body.interpretationNotes,
        },
      });
      return NextResponse.json({ message: "Template updated in PostgreSQL successfully", template: updated }, { status: 200 });
    }

    const newTemplate = await prisma.labTestTemplate.create({
      data: {
        code: cleanCode,
        name: body.name,
        category: body.category || "General Pathology",
        sampleType: body.sampleType,
        description: body.description,
        sections: sectionsStr,
        parameters: parametersStr,
        defaultRemarks: body.defaultRemarks,
        interpretationNotes: body.interpretationNotes,
        isActive: true,
      },
    });

    return NextResponse.json({ message: "Template created in PostgreSQL successfully", template: newTemplate }, { status: 201 });
  } catch (error: any) {
    console.error("[Lab Templates POST Error]:", error);
    return NextResponse.json({ error: "Failed to create/update template: " + error.message }, { status: 500 });
  }
}
