export interface DestinationSection {
  id: string;
  title: string;
  text: string;
  image: string;
}

export interface DestinationHeroSlide {
  id: string;
  image: string;
  caption: string;
  applyNowUrl: string;
}

export interface Destination {
  id: string;
  title: string;
  mainImage: string;
  heroImages: DestinationHeroSlide[];
  primaryHeroImageId: string;
  mainText: string;
  learnMoreUrl: string;
  applyOnlineUrl: string;
  enabled: 0 | 1;
  sections: DestinationSection[];
}

const STORAGE_KEY = "ifx-admin-destinations";

const seedDestinations: Destination[] = [
  {
    id: "high-performance",
    title: "High Performance Destination",
    mainImage:
      "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80",
    heroImages: [
      {
        id: "high-performance-hero-1",
        image:
          "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80",
        caption: "YOU COULD BE NEXT!",
        applyNowUrl: "https://ifxsoccer.com/apply/high-performance",
      },
      {
        id: "high-performance-hero-2",
        image:
          "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80",
        caption: "SHOWCASE YOUR TALENT",
        applyNowUrl: "https://ifxsoccer.com/apply/high-performance",
      },
      {
        id: "high-performance-hero-3",
        image:
          "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=1200&q=80",
        caption: "YOU COULD BE NEXT!",
        applyNowUrl: "https://ifxsoccer.com/apply/high-performance",
      },
    ],
    primaryHeroImageId: "high-performance-hero-1",
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
    heroImages: [
      {
        id: "summer-camp-hero-1",
        image:
          "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
        caption: "YOU COULD BE NEXT!",
        applyNowUrl: "https://ifxsoccer.com/apply/summer-camp",
      },
      {
        id: "summer-camp-hero-2",
        image:
          "https://images.unsplash.com/photo-1508098682722-e99c643e7485?auto=format&fit=crop&w=1200&q=80",
        caption: "SHOWCASE YOUR TALENT",
        applyNowUrl: "https://ifxsoccer.com/apply/summer-camp",
      },
    ],
    primaryHeroImageId: "summer-camp-hero-1",
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

const cloneDestinations = (programs: Destination[]): Destination[] =>
  programs.map((Destination) => ({
    ...Destination,
    heroImages: Destination.heroImages.map((slide) => ({ ...slide })),
    sections: Destination.sections.map((section) => ({ ...section })),
  }));

const normalizeHeroSlides = (
  heroImages: unknown,
  mainImage: string,
  applyOnlineUrl: string
): DestinationHeroSlide[] => {
  if (!Array.isArray(heroImages)) {
    if (!mainImage) {
      return [];
    }

    return [
      {
        id: `hero-${Date.now()}-0`,
        image: mainImage,
        caption: "YOU COULD BE NEXT!",
        applyNowUrl: applyOnlineUrl,
      },
    ];
  }

  if (heroImages.length === 0) {
    return mainImage
      ? [
          {
            id: `hero-${Date.now()}-0`,
            image: mainImage,
            caption: "YOU COULD BE NEXT!",
            applyNowUrl: applyOnlineUrl,
          },
        ]
      : [];
  }

  return heroImages
    .map((slide, index) => {
      if (typeof slide === "string") {
        const image = slide.trim();
        if (!image) {
          return null;
        }

        return {
          id: `hero-${Date.now()}-${index}`,
          image,
          caption: "YOU COULD BE NEXT!",
          applyNowUrl: applyOnlineUrl,
        };
      }

      if (!slide || typeof slide !== "object") {
        return null;
      }

      const raw = slide as Record<string, unknown>;
      const image = String(raw.image ?? "").trim();
      if (!image) {
        return null;
      }

      return {
        id: String(raw.id ?? `hero-${Date.now()}-${index}`),
        image,
        caption: String(raw.caption ?? "YOU COULD BE NEXT!"),
        applyNowUrl: String(raw.applyNowUrl ?? applyOnlineUrl),
      };
    })
    .filter((slide): slide is DestinationHeroSlide => Boolean(slide));
};

export const loadDestinations = (): Destination[] => {
  if (typeof window === "undefined") {
    return cloneDestinations(seedDestinations);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = cloneDestinations(seedDestinations);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid destinations payload");
    }

    return parsed.map((Destination) => ({
      id: String(Destination.id),
      title: String(Destination.title ?? ""),
      mainImage: String(Destination.mainImage ?? ""),
      heroImages: normalizeHeroSlides(
        Destination.heroImages,
        String(Destination.mainImage ?? ""),
        String(Destination.applyOnlineUrl ?? "")
      ),
      primaryHeroImageId: String(Destination.primaryHeroImageId ?? ""),
      mainText: String(Destination.mainText ?? ""),
      learnMoreUrl: String(Destination.learnMoreUrl ?? ""),
      applyOnlineUrl: String(Destination.applyOnlineUrl ?? ""),
      enabled: Destination.enabled === 1 ? (1 as const) : (0 as const),
      sections: Array.isArray(Destination.sections)
        ? Destination.sections.map((section) => ({
            id: String(section.id),
            title: String(section.title ?? ""),
            text: String(section.text ?? ""),
            image: String(section.image ?? ""),
          }))
        : [],
    })).map((Destination) => {
      const legacyPrimaryImage = String(
        (Destination as unknown as Record<string, unknown>).primaryHeroImage ?? ""
      );
      const primaryByLegacyImage = Destination.heroImages.find(
        (slide) => slide.image === legacyPrimaryImage
      );
      const fallbackPrimaryId =
        Destination.primaryHeroImageId ||
        primaryByLegacyImage?.id ||
        Destination.heroImages[0]?.id ||
        "";
      const primarySlide =
        Destination.heroImages.find((slide) => slide.id === fallbackPrimaryId) ??
        Destination.heroImages[0];

      return {
        ...Destination,
        primaryHeroImageId: primarySlide?.id ?? "",
        mainImage: primarySlide?.image ?? "",
      };
    });
  } catch {
    const initial = cloneDestinations(seedDestinations);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

export const saveDestinations = (programs: Destination[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
};

export const upsertDestination = (Destination: Destination) => {
  const programs = loadDestinations();
  const index = programs.findIndex((item) => item.id === Destination.id);

  if (index >= 0) {
    programs[index] = Destination;
  } else {
    programs.unshift(Destination);
  }

  saveDestinations(programs);
};

export const removeDestination = (id: string) => {
  const programs = loadDestinations().filter((Destination) => Destination.id !== id);
  saveDestinations(programs);
};

export const createEmptyDestinationSection = (index: number): DestinationSection => ({
  id: `section-${Date.now()}-${index}`,
  title: "",
  text: "",
  image: "",
});

export const createEmptyDestinationHeroSlide = (index: number): DestinationHeroSlide => ({
  id: `hero-${Date.now()}-${index}`,
  image: "",
  caption: "YOU COULD BE NEXT!",
  applyNowUrl: "",
});

export const createEmptyDestination = (): Destination => ({
  id: `destination-${Date.now()}`,
  title: "",
  mainImage: "",
  heroImages: [],
  primaryHeroImageId: "",
  mainText: "",
  learnMoreUrl: "",
  applyOnlineUrl: "",
  enabled: 1,
  sections: [createEmptyDestinationSection(0)],
});

