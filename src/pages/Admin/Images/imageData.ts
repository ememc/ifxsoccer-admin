import { URL_API_BASE } from "../../../config/api";

export interface ImageItem {
  id: string;
  title: string;
  imageUrl: string;
  publishedAt: string;
  enabled: 0 | 1;
  alt?: string;
  order?: number;
}

interface ApiImage {
  image_alt?: unknown;
  image_date?: unknown;
  image_enabled?: unknown;
  image_id?: unknown;
  image_order?: unknown;
  image_title?: unknown;
  image_url?: unknown;
}

interface IndexedImageItem extends ImageItem {
  sourceIndex: number;
}

export const IMAGES_API_URL = `${URL_API_BASE.replace(/\/+$/, "")}/images`;

const getImageApiUrl = (id: string) => `${IMAGES_API_URL}/${encodeURIComponent(id)}`;

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readJsonResponse = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const parseApiBody = (payload: unknown): unknown => {
  if (!isRecord(payload) || !("body" in payload)) {
    return payload;
  }

  const { body } = payload;
  return typeof body === "string" ? (body ? JSON.parse(body) : null) : body;
};

const assertSuccessfulApiPayload = (payload: unknown) => {
  if (
    isRecord(payload) &&
    typeof payload.statusCode === "number" &&
    payload.statusCode >= 400
  ) {
    throw new Error(`Error ${payload.statusCode}`);
  }
};

const normalizeApiDate = (value: unknown): string => {
  const date = String(value ?? "");
  const dayMonthYear = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!dayMonthYear) {
    return date;
  }

  return `${dayMonthYear[3]}-${dayMonthYear[2]}-${dayMonthYear[1]}`;
};

const normalizeEnabled = (value: unknown): 0 | 1 => {
  if (value === 1 || value === true || value === "1" || String(value).toLowerCase() === "true") {
    return 1;
  }

  return 0;
};

const normalizeOrder = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const order = Number(value);
  return Number.isFinite(order) ? order : undefined;
};

const extractApiImages = (payload: unknown): ApiImage[] => {
  const bodyPayload = parseApiBody(payload);

  if (Array.isArray(bodyPayload)) {
    return bodyPayload as ApiImage[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.images)) {
    return bodyPayload.images as ApiImage[];
  }

  if (isRecord(payload) && Array.isArray(payload.images)) {
    return payload.images as ApiImage[];
  }

  return [];
};

const toApiImage = (imageItem: ImageItem): ApiImage => ({
  image_alt: imageItem.alt ?? "",
  image_date: imageItem.publishedAt,
  image_enabled: imageItem.enabled,
  image_id: imageItem.id,
  image_order: imageItem.order ?? null,
  image_title: imageItem.title,
  image_url: imageItem.imageUrl,
});

const parseImageResponse = (payload: unknown, fallback: ImageItem): ImageItem => {
  const bodyPayload = parseApiBody(payload);

  if (isRecord(bodyPayload) && isRecord(bodyPayload.image)) {
    return parseImagesResponse([bodyPayload.image])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.images)) {
    const images = parseImagesResponse(payload);
    return images.find((image) => image.id === fallback.id) ?? images[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && "image_id" in bodyPayload) {
    return parseImagesResponse([bodyPayload])[0] ?? fallback;
  }

  const images = parseImagesResponse(payload);
  return images.find((image) => image.id === fallback.id) ?? images[0] ?? fallback;
};

export const parseImagesResponse = (payload: unknown): ImageItem[] => {
  const indexedImages: IndexedImageItem[] = extractApiImages(payload).map((image, sourceIndex) => ({
    id: String(image.image_id ?? `image-${sourceIndex}`),
    title: String(image.image_title ?? ""),
    imageUrl: String(image.image_url ?? ""),
    publishedAt: normalizeApiDate(image.image_date),
    enabled: normalizeEnabled(image.image_enabled),
    alt: String(image.image_alt ?? ""),
    order: normalizeOrder(image.image_order),
    sourceIndex,
  }));

  return indexedImages
    .sort((first, second) => {
      const firstOrder = first.order ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = second.order ?? Number.MAX_SAFE_INTEGER;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return first.sourceIndex - second.sourceIndex;
    })
    .map((image) => ({
      id: image.id,
      title: image.title,
      imageUrl: image.imageUrl,
      publishedAt: image.publishedAt,
      enabled: image.enabled,
      alt: image.alt,
      order: image.order,
    }));
};

export const fetchImages = async (): Promise<ImageItem[]> => {
  const response = await fetch(IMAGES_API_URL);

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseImagesResponse(payload);
};

export const fetchImage = async (id: string): Promise<ImageItem> => {
  const fallback: ImageItem = {
    id,
    title: "",
    imageUrl: "",
    publishedAt: "",
    enabled: 1,
  };
  const response = await fetch(getImageApiUrl(id));

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseImageResponse(payload, fallback);
};

export const updateImage = async (imageItem: ImageItem): Promise<ImageItem> => {
  const response = await fetch(getImageApiUrl(imageItem.id), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toApiImage(imageItem)),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseImageResponse(payload, imageItem);
};

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
      alt: String(image.alt ?? ""),
      order: normalizeOrder(image.order),
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
