import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ULTRASOUND_TEMPLATES } from "@/lib/ultrasoundTemplateRegistry";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapTemplate(template: any) {
  return {
    ...template,
    sections: template.sections ? JSON.parse(template.sections) : [],
  };
}

export async function GET() {
  try {
    let records = await prisma.ultrasoundTemplate.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });
    if (records.length === 0) {
      await prisma.ultrasoundTemplate.createMany({
        data: DEFAULT_ULTRASOUND_TEMPLATES.map((template) => ({
          code: template.code,
          name: template.name,
          category: template.category,
          sourceFileName: template.sourceFileName,
          description: template.description,
          sections: JSON.stringify(template.sections),
          isActive: true,
        })),
        skipDuplicates: true,
      });
      records = await prisma.ultrasoundTemplate.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { name: "asc" }] });
    }
    return NextResponse.json({ templates: records.map(mapTemplate) });
  } catch (error: any) {
    console.error("[Ultrasound Templates GET Error]:", error);
    return NextResponse.json({ error: `Failed to load ultrasound templates: ${error.message}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = String(body.code || "").trim().toUpperCase().replace(/\s+/g, "_");
    const name = String(body.name || "").trim();
    const sections = Array.isArray(body.sections) ? body.sections.map((value: unknown) => String(value).trim()).filter(Boolean) : [];
    if (!code || !name || sections.length === 0) {
      return NextResponse.json({ error: "Template code, name, and at least one report section are required." }, { status: 400 });
    }

    const template = await prisma.ultrasoundTemplate.upsert({
      where: { code },
      create: {
        code,
        name,
        category: String(body.category || "General"),
        sourceFileName: body.sourceFileName ? String(body.sourceFileName) : null,
        description: body.description ? String(body.description) : null,
        sections: JSON.stringify(sections),
        isActive: true,
      },
      update: {
        name,
        category: String(body.category || "General"),
        sourceFileName: body.sourceFileName ? String(body.sourceFileName) : null,
        description: body.description ? String(body.description) : null,
        sections: JSON.stringify(sections),
        isActive: true,
      },
    });
    return NextResponse.json({ template: mapTemplate(template) }, { status: 200 });
  } catch (error: any) {
    console.error("[Ultrasound Templates POST Error]:", error);
    return NextResponse.json({ error: `Failed to save ultrasound template: ${error.message}` }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Template code is required." }, { status: 400 });
    const template = await prisma.ultrasoundTemplate.update({ where: { code }, data: { isActive: false } });
    return NextResponse.json({ template: mapTemplate(template) });
  } catch (error: any) {
    console.error("[Ultrasound Templates DELETE Error]:", error);
    return NextResponse.json({ error: `Failed to delete ultrasound template: ${error.message}` }, { status: 500 });
  }
}
