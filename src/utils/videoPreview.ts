export type VideoPreview =
  | {
      kind: "youtube";
      embedUrl: string;
      thumbnailUrl: string;
    }
  | {
      kind: "file";
      sourceUrl: string;
    };

const directVideoExtensions = new Set([".mp4", ".webm", ".ogg", ".mov", ".m4v"]);

const getYouTubeVideoId = (value: string): string | null => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (!host.endsWith("youtube.com")) {
      return null;
    }

    if (url.pathname === "/watch") {
      return url.searchParams.get("v");
    }

    const [section, id] = url.pathname.split("/").filter(Boolean);

    if (["embed", "shorts", "live"].includes(section)) {
      return id ?? null;
    }
  } catch {
    return null;
  }

  return null;
};

const isDirectVideoFile = (value: string): boolean => {
  try {
    const extensionMatch = new URL(value).pathname.toLowerCase().match(/\.[a-z0-9]+$/);
    return extensionMatch ? directVideoExtensions.has(extensionMatch[0]) : false;
  } catch {
    return false;
  }
};

export const getVideoPreview = (value: string): VideoPreview | null => {
  const videoUrl = value.trim();

  if (!videoUrl) {
    return null;
  }

  const youTubeId = getYouTubeVideoId(videoUrl);

  if (youTubeId) {
    return {
      kind: "youtube",
      embedUrl: `https://www.youtube.com/embed/${youTubeId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg`,
    };
  }

  if (isDirectVideoFile(videoUrl)) {
    return {
      kind: "file",
      sourceUrl: videoUrl,
    };
  }

  return null;
};
