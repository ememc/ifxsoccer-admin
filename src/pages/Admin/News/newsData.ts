export interface News {
  id: string;
  title: string;
  image: string;
  text: string;
  enabled: 0 | 1;
}

const STORAGE_KEY = "ifx-admin-news";

const seedNews: News[] = [
  {
    id: "news-summer-camps-2026",
    title: "2026 International Youth Soccer Camps",
    image:
      "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=1200&q=80",
    text: "We continue expanding opportunities for youth players through international camps with high-level training environments and expert coaching staffs.",
    enabled: 1,
  },
  {
    id: "news-germany-trials",
    title: "Pro IFX 30 Day Germany Trials Open",
    image:
      "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80",
    text: "Applications are now open for our Germany-based soccer trials program focused on development, visibility and progression pathways.",
    enabled: 1,
  },
];

const cloneNews = (newsList: News[]): News[] => newsList.map((news) => ({ ...news }));

export const loadNews = (): News[] => {
  if (typeof window === "undefined") {
    return cloneNews(seedNews);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = cloneNews(seedNews);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as News[];
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid news payload");
    }

    return parsed.map((news) => ({
      id: String(news.id),
      title: String(news.title ?? ""),
      image: String(news.image ?? ""),
      text: String(news.text ?? ""),
      enabled: news.enabled === 1 ? (1 as const) : (0 as const),
    }));
  } catch {
    const initial = cloneNews(seedNews);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

export const saveNews = (newsList: News[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newsList));
};

export const upsertNews = (newsItem: News) => {
  const newsList = loadNews();
  const index = newsList.findIndex((item) => item.id === newsItem.id);

  if (index >= 0) {
    newsList[index] = newsItem;
  } else {
    newsList.unshift(newsItem);
  }

  saveNews(newsList);
};

export const removeNews = (id: string) => {
  const newsList = loadNews().filter((news) => news.id !== id);
  saveNews(newsList);
};

export const createEmptyNews = (): News => ({
  id: `news-${Date.now()}`,
  title: "",
  image: "",
  text: "",
  enabled: 1,
});
