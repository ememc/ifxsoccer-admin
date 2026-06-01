import { URL_API_BASE } from "../../../config/api";
import { getTodayDateInputValue } from "../../../utils/date";
import { generateGuid } from "../../../utils/guid";

export interface VideoItem {
  id: string;
  title: string;
  videoUrl: string;
  publishedAt: string;
  enabled: 0 | 1;
  alt?: string;
  order?: number;
}

interface ApiVideo {
  video_alt?: unknown;
  video_date?: unknown;
  video_enabled?: unknown;
  video_id?: unknown;
  video_order?: unknown;
  video_title?: unknown;
  video_url?: unknown;
}

interface IndexedVideoItem extends VideoItem {
  sourceIndex: number;
}

export const VIDEOS_API_URL = `${URL_API_BASE.replace(/\/+$/, "")}/videos/`;

const STORAGE_KEY = "ifx-admin-videos";

const seedVideos: VideoItem[] = [
  {
    id: "video-highlights-1",
    title: "IFX Training Highlights",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    publishedAt: "2026-04-20",
    enabled: 1,
    alt: "",
    order: 1,
  },
  {
    id: "video-camp-2",
    title: "International Camp Session",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    publishedAt: "2026-04-18",
    enabled: 1,
    alt: "",
    order: 2,
  },
];

const cloneVideos = (videos: VideoItem[]): VideoItem[] => videos.map((video) => ({ ...video }));

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
  const statusCode = isRecord(payload) ? Number(payload.statusCode) : Number.NaN;

  if (
    isRecord(payload) &&
    Number.isFinite(statusCode) &&
    statusCode >= 400
  ) {
    const bodyPayload = parseApiBody(payload);
    const message =
      isRecord(bodyPayload) && typeof bodyPayload.message === "string"
        ? bodyPayload.message
        : `Error ${statusCode}`;

    throw new Error(message);
  }
};

const unwrapDynamoValue = (value: unknown): unknown => {
  if (!isRecord(value)) {
    return value;
  }

  if ("S" in value) {
    return value.S;
  }

  if ("N" in value) {
    return value.N;
  }

  if ("BOOL" in value) {
    return value.BOOL;
  }

  if ("NULL" in value) {
    return null;
  }

  return value;
};

const normalizeApiDate = (value: unknown): string => {
  const date = String(unwrapDynamoValue(value) ?? "");
  const dayMonthYear = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!dayMonthYear) {
    return date;
  }

  return `${dayMonthYear[3]}-${dayMonthYear[2]}-${dayMonthYear[1]}`;
};

const normalizeEnabled = (value: unknown): 0 | 1 => {
  const enabled = unwrapDynamoValue(value);

  if (
    enabled === 1 ||
    enabled === true ||
    enabled === "1" ||
    String(enabled).toLowerCase() === "true"
  ) {
    return 1;
  }

  return 0;
};

const normalizeOrder = (value: unknown): number | undefined => {
  const orderValue = unwrapDynamoValue(value);

  if (orderValue === null || orderValue === undefined || orderValue === "") {
    return undefined;
  }

  const order = Number(orderValue);
  return Number.isFinite(order) ? order : undefined;
};

const extractApiVideos = (payload: unknown): ApiVideo[] => {
  const bodyPayload = parseApiBody(payload);

  if (Array.isArray(bodyPayload)) {
    return bodyPayload as ApiVideo[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.videos)) {
    return bodyPayload.videos as ApiVideo[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.items)) {
    return bodyPayload.items as ApiVideo[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.Items)) {
    return bodyPayload.Items as ApiVideo[];
  }

  if (isRecord(payload) && Array.isArray(payload.videos)) {
    return payload.videos as ApiVideo[];
  }

  return [];
};

const toApiVideoBody = (videoItem: VideoItem, includeVideoId: boolean): ApiVideo => {
  const apiVideo: ApiVideo = {
    video_alt: videoItem.alt ?? "",
    video_date: videoItem.publishedAt,
    video_enabled: videoItem.enabled === 1,
    video_order: videoItem.order ?? null,
    video_title: videoItem.title,
    video_url: videoItem.videoUrl,
  };

  if (includeVideoId) {
    apiVideo.video_id = videoItem.id;
  }

  return apiVideo;
};

const toVideoMutationEvent = (httpMethod: "POST" | "PUT", videoItem: VideoItem) => ({
  httpMethod,
  pathParameters: {
    video_id: videoItem.id,
  },
  body: JSON.stringify(toApiVideoBody(videoItem, httpMethod === "POST")),
});

const isCorsLikeFailure = (error: unknown): boolean =>
  error instanceof TypeError && /fetch|network|failed/i.test(error.message);

const postVideoMutationEvent = async (
  mutationEvent: ReturnType<typeof toVideoMutationEvent>
): Promise<unknown | null> => {
  const requestBody = JSON.stringify(mutationEvent);

  try {
    const response = await fetch(VIDEOS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const payload = await readJsonResponse(response);
    assertSuccessfulApiPayload(payload);

    return payload;
  } catch (error) {
    if (!isCorsLikeFailure(error)) {
      throw error;
    }

    await fetch(VIDEOS_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: requestBody,
    });

    return null;
  }
};

const parseVideoResponse = (payload: unknown, fallback: VideoItem): VideoItem => {
  const bodyPayload = parseApiBody(payload);

  if (isRecord(bodyPayload) && isRecord(bodyPayload.video)) {
    return parseVideosResponse([bodyPayload.video])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.item)) {
    return parseVideosResponse([bodyPayload.item])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.Item)) {
    return parseVideosResponse([bodyPayload.Item])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.data)) {
    return parseVideosResponse([bodyPayload.data])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.videos)) {
    const videos = parseVideosResponse(payload);
    return videos.find((video) => video.id === fallback.id) ?? videos[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.items)) {
    const videos = parseVideosResponse(payload);
    return videos.find((video) => video.id === fallback.id) ?? videos[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.Items)) {
    const videos = parseVideosResponse(payload);
    return videos.find((video) => video.id === fallback.id) ?? videos[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && "video_id" in bodyPayload) {
    return parseVideosResponse([bodyPayload])[0] ?? fallback;
  }

  const videos = parseVideosResponse(payload);
  return videos.find((video) => video.id === fallback.id) ?? videos[0] ?? fallback;
};

const isFallbackVideo = (video: VideoItem, fallback: VideoItem): boolean =>
  video.id === fallback.id &&
  video.title === fallback.title &&
  video.videoUrl === fallback.videoUrl &&
  video.publishedAt === fallback.publishedAt &&
  video.enabled === fallback.enabled &&
  (video.alt ?? "") === (fallback.alt ?? "") &&
  video.order === fallback.order;

export const parseVideosResponse = (payload: unknown): VideoItem[] => {
  const indexedVideos: IndexedVideoItem[] = extractApiVideos(payload).map((video, sourceIndex) => ({
    id: String(unwrapDynamoValue(video.video_id) ?? `video-${sourceIndex}`),
    title: String(unwrapDynamoValue(video.video_title) ?? ""),
    videoUrl: String(unwrapDynamoValue(video.video_url) ?? ""),
    publishedAt: normalizeApiDate(video.video_date),
    enabled: normalizeEnabled(video.video_enabled),
    alt: String(unwrapDynamoValue(video.video_alt) ?? ""),
    order: normalizeOrder(video.video_order),
    sourceIndex,
  }));

  return indexedVideos
    .sort((first, second) => {
      const firstOrder = first.order ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = second.order ?? Number.MAX_SAFE_INTEGER;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return first.sourceIndex - second.sourceIndex;
    })
    .map((video) => ({
      id: video.id,
      title: video.title,
      videoUrl: video.videoUrl,
      publishedAt: video.publishedAt,
      enabled: video.enabled,
      alt: video.alt,
      order: video.order,
    }));
};

export const fetchVideos = async (): Promise<VideoItem[]> => {
  const response = await fetch(VIDEOS_API_URL);

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseVideosResponse(payload);
};

export const fetchVideo = async (id: string): Promise<VideoItem> => {
  const fallback: VideoItem = {
    id,
    title: "",
    videoUrl: "",
    publishedAt: "",
    enabled: 1,
    alt: "",
  };

  try {
    const response = await fetch(VIDEOS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        httpMethod: "GET",
        pathParameters: {
          video_id: id,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const payload = await readJsonResponse(response);
    assertSuccessfulApiPayload(payload);

    const video = parseVideoResponse(payload, fallback);
    if (!isFallbackVideo(video, fallback)) {
      return video;
    }
  } catch {
    // If single-item GET is not available for videos, try the listed page below.
  }

  const videos = await fetchVideos();
  return videos.find((video) => video.id === id) ?? fallback;
};

export const updateVideo = async (videoItem: VideoItem): Promise<VideoItem> => {
  const payload = await postVideoMutationEvent(toVideoMutationEvent("PUT", videoItem));
  return payload ? parseVideoResponse(payload, videoItem) : videoItem;
};

export const createVideo = async (videoItem: VideoItem): Promise<VideoItem> => {
  const videoToCreate = {
    ...videoItem,
    id: videoItem.id || generateGuid(),
  };

  const payload = await postVideoMutationEvent(toVideoMutationEvent("POST", videoToCreate));
  return payload ? parseVideoResponse(payload, videoToCreate) : videoToCreate;
};

export const loadVideos = (): VideoItem[] => {
  if (typeof window === "undefined") {
    return cloneVideos(seedVideos);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = cloneVideos(seedVideos);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as VideoItem[];
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid videos payload");
    }

    return parsed.map((video) => ({
      id: String(video.id),
      title: String(video.title ?? ""),
      videoUrl: String(video.videoUrl ?? ""),
      publishedAt: String(video.publishedAt ?? ""),
      enabled: video.enabled === 1 ? (1 as const) : (0 as const),
      alt: String(video.alt ?? ""),
      order: normalizeOrder(video.order),
    }));
  } catch {
    const initial = cloneVideos(seedVideos);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

export const saveVideos = (videos: VideoItem[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
};

export const upsertVideo = (videoItem: VideoItem) => {
  const videos = loadVideos();
  const index = videos.findIndex((item) => item.id === videoItem.id);

  if (index >= 0) {
    videos[index] = videoItem;
  } else {
    videos.unshift(videoItem);
  }

  saveVideos(videos);
};

export const removeVideo = (id: string) => {
  const videos = loadVideos().filter((video) => video.id !== id);
  saveVideos(videos);
};

export const moveVideo = (id: string, direction: "up" | "down") => {
  const videos = loadVideos();
  const index = videos.findIndex((video) => video.id === id);
  if (index < 0) {
    return;
  }

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= videos.length) {
    return;
  }

  const [item] = videos.splice(index, 1);
  videos.splice(targetIndex, 0, item);
  saveVideos(videos);
};

export const createEmptyVideo = (id = generateGuid()): VideoItem => ({
  id,
  title: "",
  videoUrl: "",
  publishedAt: getTodayDateInputValue(),
  enabled: 1,
  alt: "",
});
