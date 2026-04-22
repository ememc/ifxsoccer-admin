export interface ImageItem {
  id: string;
  title: string;
  imageUrl: string;
  publishedAt: string;
  enabled: 0 | 1;
}

const STORAGE_KEY = "ifx-admin-images";

const seedImages: ImageItem[] = [
  {
    id: "image-camp-1",
    title: "IFX Camp Training Session",
    imageUrl:
      "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-04-20",
    enabled: 1,
  },
  {
    id: "image-camp-2",
    title: "International Tryout Match",
    imageUrl:
      "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-04-18",
    enabled: 1,
  },
];

const cloneImages = (images: ImageItem[]): ImageItem[] => images.map((image) => ({ ...image }));

export const loadImages = (): ImageItem[] => {
  if (typeof window === "undefined") {
    return cloneImages(seedImages);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = cloneImages(seedImages);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as ImageItem[];
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid images payload");
    }

    return parsed.map((image) => ({
      id: String(image.id),
      title: String(image.title ?? ""),
      imageUrl: String(image.imageUrl ?? ""),
      publishedAt: String(image.publishedAt ?? ""),
      enabled: image.enabled === 1 ? (1 as const) : (0 as const),
    }));
  } catch {
    const initial = cloneImages(seedImages);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

export const saveImages = (images: ImageItem[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
};

export const upsertImage = (imageItem: ImageItem) => {
  const images = loadImages();
  const index = images.findIndex((item) => item.id === imageItem.id);

  if (index >= 0) {
    images[index] = imageItem;
  } else {
    images.unshift(imageItem);
  }

  saveImages(images);
};

export const removeImage = (id: string) => {
  const images = loadImages().filter((image) => image.id !== id);
  saveImages(images);
};

export const moveImage = (id: string, direction: "up" | "down") => {
  const images = loadImages();
  const index = images.findIndex((image) => image.id === id);
  if (index < 0) {
    return;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= images.length) {
    return;
  }

  const [item] = images.splice(index, 1);
  images.splice(targetIndex, 0, item);
  saveImages(images);
};

export const createEmptyImage = (): ImageItem => ({
  id: `image-${Date.now()}`,
  title: "",
  imageUrl: "",
  publishedAt: "",
  enabled: 1,
});
