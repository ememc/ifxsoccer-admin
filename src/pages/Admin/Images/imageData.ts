export interface ImageItem {
  id: string;
  title: string;
  imageUrl: string;
  publishedAt: string;
  enabled: 0 | 1;
  order: number;
}

export const IMAGES_API_URL =
  "https://wnst4od7yyiclacd6dvrz7uwom0mnlfq.lambda-url.us-west-1.on.aws/";

interface ImageApiItem {
  image_title?: unknown;
  image__url?: unknown;
  image_url?: unknown;
  image_enabled?: unknown;
  iamge_id?: unknown;
  image_id?: unknown;
  image_date?: unknown;
  image_order?: unknown;
}

interface ImagesApiResponse {
  images?: ImageApiItem[];
}

const normalizeDate = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }

  const ddmmyyyyMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month}-${day}`;
  }

  const yyyymmddMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmddMatch) {
    return raw;
  }

  return "";
};

const serializeDate = (value: string): string => {
  const raw = value.trim();
  if (!raw) {
    return "";
  }

  const yyyymmddMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return `${day}-${month}-${year}`;
  }

  return raw;
};

const normalizeImage = (image: ImageApiItem): ImageItem => ({
  id: String(image.image_id ?? image.iamge_id ?? ""),
  title: String(image.image_title ?? ""),
  imageUrl: String(image.image_url ?? image.image__url ?? ""),
  publishedAt: normalizeDate(image.image_date),
  enabled: Number(image.image_enabled) === 1 ? (1 as const) : (0 as const),
  order: Number(image.image_order ?? 0),
});

export const fetchImages = async (): Promise<ImageItem[]> => {
  const response = await fetch(IMAGES_API_URL);
  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = (await response.json()) as ImagesApiResponse;
  const items = Array.isArray(payload.images) ? payload.images : [];

  return items
    .map(normalizeImage)
    .filter((image) => image.id.trim().length > 0)
    .sort((first, second) => first.order - second.order);
};

export const fetchImageById = async (id: string): Promise<ImageItem | null> => {
  const images = await fetchImages();
  return images.find((image) => image.id === id) ?? null;
};

export const saveImage = async (
  image: ImageItem,
  mode: "create" | "edit"
): Promise<void> => {
  const payload = {
    image_id: image.id,
    image_title: image.title.trim(),
    image_url: image.imageUrl.trim(),
    image_date: serializeDate(image.publishedAt),
    image_enabled: image.enabled,
  };

  const response = await fetch(IMAGES_API_URL, {
    method: mode === "create" ? "POST" : "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }
};

export const createEmptyImage = (): ImageItem => ({
  id: crypto.randomUUID(),
  title: "",
  imageUrl: "",
  publishedAt: "",
  enabled: 1,
  order: 0,
});
