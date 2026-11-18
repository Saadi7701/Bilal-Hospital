export interface UltrasoundTemplateDef {
  code: string;
  name: string;
  category: string;
  sourceFileName: string;
  description: string;
  sections: string[];
}

const section = (name: string, ...items: string[]) => [name, ...items];

export const DEFAULT_ULTRASOUND_TEMPLATES: UltrasoundTemplateDef[] = [
  {
    code: "US_ABDOMEN",
    name: "Abdomen Ultrasound",
    category: "Abdomen",
    sourceFileName: "Normal Abdomen_Ultrasound.docx",
    description: "Abdominal sonography report format from the supplied normal abdomen template.",
    sections: section("ABDOMEN ULTRASOUND", "Liver", "Common bile duct", "Portal vein", "Gall bladder", "Spleen and pancreas", "Right kidney", "Left kidney", "Urinary bladder", "Free fluid / bowel loops", "IMPRESSION"),
  },
  {
    code: "US_ABDOMEN_ALT",
    name: "Abdomen Ultrasound (Kidneys & Pelvis)",
    category: "Abdomen",
    sourceFileName: "Normal Abdomen_Ultrasound - Copy (2).docx",
    description: "Abdomen, paired kidney measurements, bladder and free-fluid report format.",
    sections: section("ABDOMEN ULTRASOUND", "Liver", "Right kidney measurements", "Left kidney measurements", "Urinary bladder", "Bowel loops", "Free fluid", "IMPRESSION"),
  },
  {
    code: "US_KUB",
    name: "KUB Ultrasound",
    category: "Abdomen",
    sourceFileName: "KUB  ABNORMALulTRASOUND - Copy - Copy.docx",
    description: "Kidneys, ureters, bladder and prostate report format.",
    sections: section("KUB ULTRASOUND", "Right kidney", "Left kidney", "Urinary bladder", "Pre-void volume", "Post-void residual volume", "Prostate", "IMPRESSION"),
  },
  {
    code: "US_PELVIS",
    name: "Pelvis Ultrasound",
    category: "Pelvis",
    sourceFileName: "PELVIS NORMAL - Copy.docx",
    description: "Uterus, endometrium, cervix, ovaries and bladder report format.",
    sections: section("ULTRASOUND PELVIS", "UTERUS", "ENDOMETRIUM", "CERVIX", "OVARIES", "Urinary bladder", "IMPRESSION"),
  },
  {
    code: "US_OBSC",
    name: "Obstetric Ultrasound (OBSC)",
    category: "Obstetric",
    sourceFileName: "OBSC.docx",
    description: "Obstetric scan format for fetal status, placenta, liquor, biometry and gestational age.",
    sections: section("OBSC / USG", "Fetal number, viability and presentation", "Liquor", "Placenta", "Fetal movement", "BPD", "FL", "Gestational age", "EDD", "Cord and cardiac views", "Fetal anatomy / ascites", "IMPRESSION"),
  },
  {
    code: "US_EARLY_OB",
    name: "Early Pregnancy / First Trimester Ultrasound",
    category: "Obstetric",
    sourceFileName: "Abdomen_1st trimester - second format.docx",
    description: "First trimester obstetric scan format for gestational sac, CRL, cardiac activity and cervix.",
    sections: section("OBS ULTRASOUND", "Intrauterine pregnancy / fetal position", "Cardiac activity", "Liquor", "Internal os", "Adnexa", "CRL", "Gestational age", "CONCLUSION"),
  },
  {
    code: "US_GESTATION_SAC",
    name: "Gestational Sac Ultrasound",
    category: "Obstetric",
    sourceFileName: "gestation sac.docx",
    description: "Early pregnancy report format for sac, fetal pole, yolk sac and follow-up recommendation.",
    sections: section("OBSC / USG", "Uterus and gestational sac", "Gestational sac measurement", "Gestational age", "Internal os", "Adnexa and POD", "Follow-up", "CONCLUSION"),
  },
  {
    code: "US_FETAL_ANOMALY",
    name: "Fetal Anomaly Scan",
    category: "Obstetric",
    sourceFileName: "fetal anamoly.docx",
    description: "Detailed fetal biometry and anatomy survey report format.",
    sections: section("FETAL ANOMALY SCAN", "Fetal status and presentation", "FETAL BIOMETRY", "Liquor and placenta", "Gestational age and EDD", "Fetal movement", "FETAL ANATOMY - BRAIN", "SPINE", "NECK", "FACE", "THORAX", "ABDOMEN", "URINARY TRACT", "LIMBS", "CONCLUSION"),
  },
  {
    code: "US_TESTIS",
    name: "Testicular / Scrotal Ultrasound",
    category: "Small Parts",
    sourceFileName: "Testis Altrasound.docx",
    description: "Testis, epididymis, scrotal wall and fluid/mass assessment format.",
    sections: section("TESTIS ULTRASOUND", "Technique", "Right and left testis size", "Echogenicity and echotexture", "Epididymis", "Scrotal wall", "Hydrocele / varicocele / mass", "CONCLUSION"),
  },
  {
    code: "US_THYROID",
    name: "Thyroid Ultrasound",
    category: "Small Parts",
    sourceFileName: "THYROID.docx",
    description: "Thyroid lobes, isthmus, nodules and adjacent neck structures report format.",
    sections: section("THYROID SCAN", "Right thyroid lobe", "Left thyroid lobe", "Isthmus", "Nodules / calcification", "Adjacent neck structures and lymph nodes", "IMPRESSION"),
  },
];

export function getDefaultUltrasoundTemplate(code: string): UltrasoundTemplateDef | undefined {
  return DEFAULT_ULTRASOUND_TEMPLATES.find((template) => template.code === code.trim().toUpperCase());
}
