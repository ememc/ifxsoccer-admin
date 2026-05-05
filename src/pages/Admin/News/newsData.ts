import { URL_API_BASE } from "../../../config/api";
import { generateGuid } from "../../../utils/guid";

export interface News {
  id: string;
  image: string;
  date: string;
  state: string;
  enabled: 0 | 1;
  category: string;
  programBy: string;
  tags: string;
  text: string;
}

interface ApiNews {
  news_category?: unknown;
  news_date?: unknown;
  news_enabled?: unknown;
  news_id?: unknown;
  news_image?: unknown;
  news_program_by?: unknown;
  news_state?: unknown;
  news_tags?: unknown;
  news_text?: unknown;
}

interface IndexedNewsItem extends News {
  sourceIndex: number;
}

export const NEWS_API_URL = `${URL_API_BASE.replace(/\/+$/, "")}/news/`;

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

  if (isRecord(payload) && Number.isFinite(statusCode) && statusCode >= 400) {
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

const extractApiNews = (payload: unknown): ApiNews[] => {
  const bodyPayload = parseApiBody(payload);

  if (Array.isArray(bodyPayload)) {
    return bodyPayload as ApiNews[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.news)) {
    return bodyPayload.news as ApiNews[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.items)) {
    return bodyPayload.items as ApiNews[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.Items)) {
    return bodyPayload.Items as ApiNews[];
  }

  if (isRecord(payload) && Array.isArray(payload.news)) {
    return payload.news as ApiNews[];
  }

  return [];
};

const toApiNewsBody = (newsItem: News): ApiNews => ({
  news_category: newsItem.category,
  news_date: newsItem.date,
  news_enabled: newsItem.enabled === 1,
  news_id: newsItem.id,
  news_image: newsItem.image,
  news_program_by: newsItem.programBy,
  news_state: newsItem.state,
  news_tags: newsItem.tags,
  news_text: newsItem.text,
});

const toNewsMutationEvent = (httpMethod: "POST" | "PUT", newsItem: News) => ({
  httpMethod,
  pathParameters: {
    news_id: newsItem.id,
  },
  body: JSON.stringify(toApiNewsBody(newsItem)),
});

const isCorsLikeFailure = (error: unknown): boolean =>
  error instanceof TypeError && /fetch|network|failed/i.test(error.message);

const postNewsMutationEvent = async (
  mutationEvent: ReturnType<typeof toNewsMutationEvent>
): Promise<unknown | null> => {
  const requestBody = JSON.stringify(mutationEvent);

  try {
    const response = await fetch(NEWS_API_URL, {
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

    await fetch(NEWS_API_URL, {
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

const parseNewsResponse = (payload: unknown, fallback: News): News => {
  const bodyPayload = parseApiBody(payload);

  if (isRecord(bodyPayload) && isRecord(bodyPayload.news)) {
    return parseNewsListResponse([bodyPayload.news])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.item)) {
    return parseNewsListResponse([bodyPayload.item])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.Item)) {
    return parseNewsListResponse([bodyPayload.Item])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.data)) {
    return parseNewsListResponse([bodyPayload.data])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.news)) {
    const news = parseNewsListResponse(payload);
    return news.find((item) => item.id === fallback.id) ?? news[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.items)) {
    const news = parseNewsListResponse(payload);
    return news.find((item) => item.id === fallback.id) ?? news[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.Items)) {
    const news = parseNewsListResponse(payload);
    return news.find((item) => item.id === fallback.id) ?? news[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && "news_id" in bodyPayload) {
    return parseNewsListResponse([bodyPayload])[0] ?? fallback;
  }

  const news = parseNewsListResponse(payload);
  return news.find((item) => item.id === fallback.id) ?? news[0] ?? fallback;
};

const isFallbackNews = (newsItem: News, fallback: News): boolean =>
  newsItem.id === fallback.id &&
  newsItem.image === fallback.image &&
  newsItem.date === fallback.date &&
  newsItem.state === fallback.state &&
  newsItem.enabled === fallback.enabled &&
  newsItem.category === fallback.category &&
  newsItem.programBy === fallback.programBy &&
  newsItem.tags === fallback.tags &&
  newsItem.text === fallback.text;

export const parseNewsListResponse = (payload: unknown): News[] => {
  const indexedNews: IndexedNewsItem[] = extractApiNews(payload).map((news, sourceIndex) => ({
    id: String(unwrapDynamoValue(news.news_id) ?? `news-${sourceIndex}`),
    image: String(unwrapDynamoValue(news.news_image) ?? ""),
    date: normalizeApiDate(news.news_date),
    state: String(unwrapDynamoValue(news.news_state) ?? ""),
    enabled: normalizeEnabled(news.news_enabled),
    category: String(unwrapDynamoValue(news.news_category) ?? ""),
    programBy: String(unwrapDynamoValue(news.news_program_by) ?? ""),
    tags: String(unwrapDynamoValue(news.news_tags) ?? ""),
    text: String(unwrapDynamoValue(news.news_text) ?? ""),
    sourceIndex,
  }));

  return indexedNews
    .sort((first, second) => {
      if (first.date !== second.date) {
        return second.date.localeCompare(first.date);
      }

      return first.sourceIndex - second.sourceIndex;
    })
    .map((news) => ({
      id: news.id,
      image: news.image,
      date: news.date,
      state: news.state,
      enabled: news.enabled,
      category: news.category,
      programBy: news.programBy,
      tags: news.tags,
      text: news.text,
    }));
};

export const fetchNews = async (): Promise<News[]> => {
  const response = await fetch(NEWS_API_URL);

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseNewsListResponse(payload);
};

export const fetchNewsItem = async (id: string): Promise<News> => {
  const fallback = createEmptyNews(id);

  try {
    const response = await fetch(NEWS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        httpMethod: "GET",
        pathParameters: {
          news_id: id,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const payload = await readJsonResponse(response);
    assertSuccessfulApiPayload(payload);

    const newsItem = parseNewsResponse(payload, fallback);
    if (!isFallbackNews(newsItem, fallback)) {
      return newsItem;
    }
  } catch {
    // If single-item GET is not available for news, try the list endpoint below.
  }

  const news = await fetchNews();
  return news.find((item) => item.id === id) ?? fallback;
};

export const updateNews = async (newsItem: News): Promise<News> => {
  const payload = await postNewsMutationEvent(toNewsMutationEvent("PUT", newsItem));
  return payload ? parseNewsResponse(payload, newsItem) : newsItem;
};

export const createNews = async (newsItem: News): Promise<News> => {
  const newsToCreate = {
    ...newsItem,
    id: newsItem.id || generateGuid(),
  };

  const payload = await postNewsMutationEvent(toNewsMutationEvent("POST", newsToCreate));
  return payload ? parseNewsResponse(payload, newsToCreate) : newsToCreate;
};

export const createEmptyNews = (id = generateGuid()): News => ({
  id,
  image: "",
  date: "",
  state: "",
  enabled: 1,
  category: "",
  programBy: "",
  tags: "",
  text: "",
});

export const getNewsPlainText = (html: string): string => {
  const content = String(html ?? "");

  if (typeof document !== "undefined") {
    const template = document.createElement("template");
    template.innerHTML = content;
    return (template.content.textContent ?? "").replace(/\s+/g, " ").trim();
  }

  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
};

export const getNewsDisplayTitle = (newsItem: News): string => {
  if (typeof document !== "undefined") {
    const template = document.createElement("template");
    template.innerHTML = newsItem.text;
    const heading = template.content.querySelector("h1, h2, h3");
    const headingText = heading?.textContent?.replace(/\s+/g, " ").trim();

    if (headingText) {
      return headingText;
    }
  }

  const plainText = getNewsPlainText(newsItem.text);
  return plainText || newsItem.category || newsItem.id;
};
