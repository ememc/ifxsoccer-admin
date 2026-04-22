export interface Category {
  id: string;
  title: string;
  image: string;
  mainText: string;
  learnMoreUrl: string;
  applyOnlineUrl: string;
  enabled: 0 | 1;
  sections: CategorySection[];
}

export interface CategorySection {
  id: string;
  title: string;
  text: string;
  image: string;
  learnMoreUrl: string;
  applyOnlineUrl: string;
  enabled: 0 | 1;
}

const STORAGE_KEY = "ifx-admin-categories";

const seedCategories: Category[] = [
  {
    id: "residential",
    title: "Residential Programs",
    image:
      "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80",
    mainText:
      "Categorias orientadas a jugadores que buscan una experiencia de formacion con estructura, acompanamiento y desarrollo continuo.",
    learnMoreUrl: "https://ifxsoccer.com/categories/residential",
    applyOnlineUrl: "https://ifxsoccer.com/apply/residential",
    enabled: 1,
    sections: [
      {
        id: "residential-1",
        title: "Academy Residency",
        text: "Entrenamiento, acompanamiento diario y una estructura de desarrollo integral para jugadores en etapa competitiva.",
        image:
          "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80",
        learnMoreUrl: "https://ifxsoccer.com/categories/residential/academy",
        applyOnlineUrl: "https://ifxsoccer.com/apply/residential/academy",
        enabled: 1,
      },
      {
        id: "residential-2",
        title: "Boarding Pathway",
        text: "Una ruta pensada para combinar formacion academica, vida residencial y progresion deportiva.",
        image:
          "https://images.unsplash.com/photo-1508098682722-e99c643e7485?auto=format&fit=crop&w=1200&q=80",
        learnMoreUrl: "https://ifxsoccer.com/categories/residential/boarding",
        applyOnlineUrl: "https://ifxsoccer.com/apply/residential/boarding",
        enabled: 1,
      },
      {
        id: "residential-3",
        title: "Elite Exposure",
        text: "Competencias, seguimiento y exposicion para jugadores que quieren dar el siguiente paso.",
        image:
          "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80",
        learnMoreUrl: "https://ifxsoccer.com/categories/residential/exposure",
        applyOnlineUrl: "https://ifxsoccer.com/apply/residential/exposure",
        enabled: 0,
      },
    ],
  },
  {
    id: "international",
    title: "International Pathways",
    image:
      "https://images.unsplash.com/photo-1486286701208-1d58e9338013?auto=format&fit=crop&w=1200&q=80",
    mainText:
      "Categorias que organizan opciones internacionales, procesos academicos y rutas de exposicion para distintos perfiles.",
    learnMoreUrl: "https://ifxsoccer.com/categories/international",
    applyOnlineUrl: "https://ifxsoccer.com/apply/international",
    enabled: 0,
    sections: [
      {
        id: "international-1",
        title: "Europe Pathway",
        text: "Programas y experiencias para jugadores interesados en oportunidades dentro del ecosistema europeo.",
        image:
          "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
        learnMoreUrl: "https://ifxsoccer.com/categories/international/europe",
        applyOnlineUrl: "https://ifxsoccer.com/apply/international/europe",
        enabled: 1,
      },
    ],
  },
];

const cloneCategories = (categories: Category[]): Category[] =>
  categories.map((category) => ({
    ...category,
    sections: category.sections.map((section) => ({ ...section })),
  }));

export const loadCategories = (): Category[] => {
  if (typeof window === "undefined") {
    return cloneCategories(seedCategories);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = cloneCategories(seedCategories);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as Category[];
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid categories payload");
    }

    return parsed.map((category) => ({
      id: String(category.id),
      title: category.title ?? "",
      image: category.image ?? "",
      mainText: category.mainText ?? "",
      learnMoreUrl: category.learnMoreUrl ?? "",
      applyOnlineUrl: category.applyOnlineUrl ?? "",
      enabled: category.enabled === 1 ? 1 : 0,
      sections: Array.isArray(category.sections)
        ? category.sections.map((section) => ({
            id: String(section.id),
            title: section.title ?? "",
            text: section.text ?? "",
            image: section.image ?? "",
            learnMoreUrl: section.learnMoreUrl ?? "",
            applyOnlineUrl: section.applyOnlineUrl ?? "",
            enabled: section.enabled === 1 ? 1 : 0,
          }))
        : [],
    }));
  } catch {
    const initial = cloneCategories(seedCategories);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

export const saveCategories = (categories: Category[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
};

export const upsertCategory = (category: Category) => {
  const categories = loadCategories();
  const index = categories.findIndex((item) => item.id === category.id);

  if (index >= 0) {
    categories[index] = category;
  } else {
    categories.unshift(category);
  }

  saveCategories(categories);
};

export const removeCategory = (id: string) => {
  const categories = loadCategories().filter((category) => category.id !== id);
  saveCategories(categories);
};

export const createEmptyCategory = (): Category => ({
  id: `category-${Date.now()}`,
  title: "",
  image: "",
  mainText: "",
  learnMoreUrl: "",
  applyOnlineUrl: "",
  enabled: 1,
  sections: [createEmptyCategorySection(0)],
});

export const createEmptyCategorySection = (index: number): CategorySection => ({
  id: `category-section-${Date.now()}-${index}`,
  title: "",
  text: "",
  image: "",
  learnMoreUrl: "",
  applyOnlineUrl: "",
  enabled: 1,
});
