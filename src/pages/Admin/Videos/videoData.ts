export interface VideoItem {
  id: string;
  title: string;
  videoUrl: string;
  publishedAt: string;
  enabled: 0 | 1;
}

const STORAGE_KEY = "ifx-admin-videos";

const seedVideos: VideoItem[] = [
  {
    id: "video-highlights-1",
    title: "IFX Training Highlights",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    publishedAt: "2026-04-20",
    enabled: 1,
  },
  {
    id: "video-camp-2",
    title: "International Camp Session",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    publishedAt: "2026-04-18",
    enabled: 1,
  },
];

const cloneVideos = (videos: VideoItem[]): VideoItem[] => videos.map((video) => ({ ...video }));

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

export const createEmptyVideo = (): VideoItem => ({
  id: `video-${Date.now()}`,
  title: "",
  videoUrl: "",
  publishedAt: "",
  enabled: 1,
});
