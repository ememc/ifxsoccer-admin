export interface ProgramSection {
  id: string;
  title: string;
  text: string;
  image: string;
}

export interface Program {
  id: string;
  title: string;
  mainImage: string;
  mainText: string;
  learnMoreUrl: string;
  applyOnlineUrl: string;
  enabled: 0 | 1;
  sections: ProgramSection[];
}

const STORAGE_KEY = "ifx-admin-programs";

const seedPrograms: Program[] = [
  {
    id: "high-performance",
    title: "High Performance Program",
    mainImage:
      "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80",
    mainText:
      "Programa enfocado en jugadores que buscan una ruta competitiva con entrenamiento, seguimiento y visibilidad.",
    learnMoreUrl: "https://ifxsoccer.com/programs/high-performance",
    applyOnlineUrl: "https://ifxsoccer.com/apply/high-performance",
    enabled: 1,
    sections: [
      {
        id: "high-performance-1",
        title: "Entrenamiento Integral",
        text: "Sesiones tecnicas, tacticas y fisicas disenadas para acelerar el desarrollo competitivo del jugador.",
        image:
          "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: "high-performance-2",
        title: "Exposicion y Seguimiento",
        text: "Acompanamiento del proceso con reportes, material visual y una estructura lista para escalar cuando el API este disponible.",
        image:
          "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "summer-camp",
    title: "Summer Camp",
    mainImage:
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
    mainText:
      "Experiencia intensiva para combinar entrenamiento, formacion personal y actividades complementarias.",
    learnMoreUrl: "https://ifxsoccer.com/programs/summer-camp",
    applyOnlineUrl: "https://ifxsoccer.com/apply/summer-camp",
    enabled: 0,
    sections: [
      {
        id: "summer-camp-1",
        title: "Metodologia Diaria",
        text: "Bloques estructurados para tecnica, toma de decisiones y contextos reales de juego.",
        image:
          "https://images.unsplash.com/photo-1508098682722-e99c643e7485?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
];

const clonePrograms = (programs: Program[]): Program[] =>
  programs.map((program) => ({
    ...program,
    sections: program.sections.map((section) => ({ ...section })),
  }));

export const loadPrograms = (): Program[] => {
  if (typeof window === "undefined") {
    return clonePrograms(seedPrograms);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = clonePrograms(seedPrograms);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as Program[];
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid programs payload");
    }

    return parsed.map((program) => ({
      id: String(program.id),
      title: program.title ?? "",
      mainImage: program.mainImage ?? "",
      mainText: program.mainText ?? "",
      learnMoreUrl: program.learnMoreUrl ?? "",
      applyOnlineUrl: program.applyOnlineUrl ?? "",
      enabled: program.enabled === 1 ? 1 : 0,
      sections: Array.isArray(program.sections)
        ? program.sections.map((section) => ({
            id: String(section.id),
            title: section.title ?? "",
            text: section.text ?? "",
            image: section.image ?? "",
          }))
        : [],
    }));
  } catch {
    const initial = clonePrograms(seedPrograms);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

export const savePrograms = (programs: Program[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
};

export const upsertProgram = (program: Program) => {
  const programs = loadPrograms();
  const index = programs.findIndex((item) => item.id === program.id);

  if (index >= 0) {
    programs[index] = program;
  } else {
    programs.unshift(program);
  }

  savePrograms(programs);
};

export const removeProgram = (id: string) => {
  const programs = loadPrograms().filter((program) => program.id !== id);
  savePrograms(programs);
};

export const createEmptySection = (index: number): ProgramSection => ({
  id: `section-${Date.now()}-${index}`,
  title: "",
  text: "",
  image: "",
});

export const createEmptyProgram = (): Program => ({
  id: `program-${Date.now()}`,
  title: "",
  mainImage: "",
  mainText: "",
  learnMoreUrl: "",
  applyOnlineUrl: "",
  enabled: 1,
  sections: [createEmptySection(0)],
});
