import fs from "node:fs/promises";
import path from "node:path";

const PERSONAS = {
  hitesh: {
    id: "hitesh",
    name: "Hitesh",
    file: "hitesh-pesona.txt",
    introLabel: "Hitesh sir's intro",
    starterPrompts: [
      "Backlog kaise cover karu without getting overwhelmed?",
      "If I am starting coding today, where should I begin?",
      "College placement ko serious kaise handle karna chahiye?"
    ]
  },
  piyush: {
    id: "piyush",
    name: "Piyush",
    file: "piyush-persona.txt",
    manualFile: "piyush_manual.txt",
    introLabel: "Piyush sir's intro",
    starterPrompts: [
      "Internship ke liye profile strong kaise banau?",
      "AI ke time me real engineering skill kaise build karu?",
      "Ek strong full stack project me kya hona chahiye?"
    ]
  }
};

async function readPersonaFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  return fs.readFile(filePath, "utf8");
}

function extractIntroduction(text, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionPattern = new RegExp(`${escapedLabel}:\\s*([\\s\\S]*?)(?=\\n\\s*\\n\\s*[A-Za-z][^\\n]*:|$)`, "i");
  const match = text.match(sectionPattern);

  return match?.[1]?.trim() || "";
}

export async function loadPersona(personaId) {
  const persona = PERSONAS[personaId];
  if (!persona) {
    throw new Error("Persona not found");
  }

  const profile = await readPersonaFile(persona.file);
  const manualNotes = persona.manualFile ? await readPersonaFile(persona.manualFile) : "";
  const introductionFile = await readPersonaFile("introduction.txt").catch(() => "");
  const introduction = introductionFile ? extractIntroduction(introductionFile, persona.introLabel) : "";

  return {
    ...persona,
    profile,
    manualNotes,
    introduction
  };
}

export async function listPersonas() {
  return Object.values(PERSONAS).map(({ id, name, starterPrompts }) => ({
    id,
    name,
    starterPrompts
  }));
}
