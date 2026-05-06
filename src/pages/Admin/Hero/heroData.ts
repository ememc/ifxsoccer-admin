import { URL_API_BASE } from "../../../config/api";
import { generateGuid } from "../../../utils/guid";

export interface HeroItem {
  id: string;
  title: string;
  button: string;
  call: string;
  date: string;
  enabled: 0 | 1;
  image: string;
}

interface ApiHero {
  hero_button?: unknown;
  hero_call?: unknown;
  hero_date?: unknown;
  hero_enabled?: unknown;
  hero_id?: unknown;
  hero_image?: unknown;
  hero_title?: unknown;
}

export interface ApiHeroItem {
  hero_id: string;
  hero_button: string;
  hero_call: string;
  hero_date: string;
  hero_enabled: string | number | boolean;
  hero_image: string;
  hero_title: string;
}

interface IndexedHeroItem extends HeroItem {
  sourceIndex: number;
}

export const HEROS_API_URL = `${URL_API_BASE.replace(/\/+$/, "")}/heros/`;

const STORAGE_KEY = "ifx-admin-heros";

const seedHeros: HeroItem[] = [
  {
    id: "hero-home-1",
    title: "IFX Soccer",
    button: "Apply Now",
    call: "https://ifxsoccer.com/apply",
    date: "2026-04-20",
    enabled: 1,
    image: "",
  },
];

const cloneHeros = (heros: HeroItem[]): HeroItem[] => heros.map((hero) => ({ ...hero }));

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

const extractApiHeros = (payload: unknown): ApiHero[] => {
  const bodyPayload = parseApiBody(payload);

  if (Array.isArray(bodyPayload)) {
    return bodyPayload as ApiHero[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.hero)) {
    return bodyPayload.hero as ApiHero[];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.hero)) {
    return [bodyPayload.hero as ApiHero];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.heros)) {
    return bodyPayload.heros as ApiHero[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.heroes)) {
    return bodyPayload.heroes as ApiHero[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.items)) {
    return bodyPayload.items as ApiHero[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.Items)) {
    return bodyPayload.Items as ApiHero[];
  }

  if (isRecord(payload) && Array.isArray(payload.heros)) {
    return payload.heros as ApiHero[];
  }

  if (isRecord(payload) && Array.isArray(payload.hero)) {
    return payload.hero as ApiHero[];
  }

  if (isRecord(payload) && isRecord(payload.hero)) {
    return [payload.hero as ApiHero];
  }

  if (isRecord(payload) && Array.isArray(payload.heroes)) {
    return payload.heroes as ApiHero[];
  }

  return [];
};

const toApiHeroBody = (heroItem: HeroItem): ApiHero => ({
  hero_button: heroItem.button,
  hero_call: heroItem.call,
  hero_date: heroItem.date,
  hero_enabled: heroItem.enabled === 1,
  hero_id: heroItem.id,
  hero_image: heroItem.image,
  hero_title: heroItem.title,
});

const toHeroMutationEvent = (httpMethod: "POST" | "PUT", heroItem: HeroItem) => ({
  httpMethod,
  pathParameters: {
    hero_id: heroItem.id,
  },
  body: JSON.stringify(toApiHeroBody(heroItem)),
});

const isCorsLikeFailure = (error: unknown): boolean =>
  error instanceof TypeError && /fetch|network|failed/i.test(error.message);

const postHeroMutationEvent = async (
  mutationEvent: ReturnType<typeof toHeroMutationEvent>
): Promise<unknown | null> => {
  const requestBody = JSON.stringify(mutationEvent);

  try {
    const response = await fetch(HEROS_API_URL, {
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

    await fetch(HEROS_API_URL, {
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

const parseHeroResponse = (payload: unknown, fallback: HeroItem): HeroItem => {
  const bodyPayload = parseApiBody(payload);

  if (isRecord(bodyPayload) && isRecord(bodyPayload.hero)) {
    return parseHerosResponse([bodyPayload.hero])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.item)) {
    return parseHerosResponse([bodyPayload.item])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.Item)) {
    return parseHerosResponse([bodyPayload.Item])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.data)) {
    return parseHerosResponse([bodyPayload.data])[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.heros)) {
    const heros = parseHerosResponse(payload);
    return heros.find((hero) => hero.id === fallback.id) ?? heros[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.heroes)) {
    const heros = parseHerosResponse(payload);
    return heros.find((hero) => hero.id === fallback.id) ?? heros[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.items)) {
    const heros = parseHerosResponse(payload);
    return heros.find((hero) => hero.id === fallback.id) ?? heros[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.Items)) {
    const heros = parseHerosResponse(payload);
    return heros.find((hero) => hero.id === fallback.id) ?? heros[0] ?? fallback;
  }

  if (isRecord(bodyPayload) && "hero_id" in bodyPayload) {
    return parseHerosResponse([bodyPayload])[0] ?? fallback;
  }

  const heros = parseHerosResponse(payload);
  return heros.find((hero) => hero.id === fallback.id) ?? heros[0] ?? fallback;
};

const isFallbackHero = (heroItem: HeroItem, fallback: HeroItem): boolean =>
  heroItem.id === fallback.id &&
  heroItem.title === fallback.title &&
  heroItem.button === fallback.button &&
  heroItem.call === fallback.call &&
  heroItem.date === fallback.date &&
  heroItem.enabled === fallback.enabled &&
  heroItem.image === fallback.image;

export const parseHerosResponse = (payload: unknown): HeroItem[] => {
  const indexedHeros: IndexedHeroItem[] = extractApiHeros(payload).map((hero, sourceIndex) => ({
    id: String(unwrapDynamoValue(hero.hero_id) ?? `hero-${sourceIndex}`),
    title: String(unwrapDynamoValue(hero.hero_title) ?? ""),
    button: String(unwrapDynamoValue(hero.hero_button) ?? ""),
    call: String(unwrapDynamoValue(hero.hero_call) ?? ""),
    date: normalizeApiDate(hero.hero_date),
    enabled: normalizeEnabled(hero.hero_enabled),
    image: String(unwrapDynamoValue(hero.hero_image) ?? ""),
    sourceIndex,
  }));

  return indexedHeros
    .sort((first, second) => {
      if (first.date !== second.date) {
        return second.date.localeCompare(first.date);
      }

      return first.sourceIndex - second.sourceIndex;
    })
    .map((hero) => ({
      id: hero.id,
      title: hero.title,
      button: hero.button,
      call: hero.call,
      date: hero.date,
      enabled: hero.enabled,
      image: hero.image,
    }));
};

export const parseApiHerosResponse = (payload: unknown): ApiHeroItem[] =>
  extractApiHeros(payload).map((hero) => ({
    hero_id: String(unwrapDynamoValue(hero.hero_id) ?? ""),
    hero_button: String(unwrapDynamoValue(hero.hero_button) ?? ""),
    hero_call: String(unwrapDynamoValue(hero.hero_call) ?? ""),
    hero_date: normalizeApiDate(hero.hero_date),
    hero_enabled: unwrapDynamoValue(hero.hero_enabled) as string | number | boolean,
    hero_image: String(unwrapDynamoValue(hero.hero_image) ?? ""),
    hero_title: String(unwrapDynamoValue(hero.hero_title) ?? ""),
  }));

export const fetchHeros = async (): Promise<HeroItem[]> => {
  const response = await fetch(HEROS_API_URL);

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseHerosResponse(payload);
};

export const fetchApiHeros = async (): Promise<ApiHeroItem[]> => {
  const response = await fetch(HEROS_API_URL);

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseApiHerosResponse(payload);
};

export const fetchHero = async (id: string): Promise<HeroItem> => {
  const fallback = createEmptyHero(id);

  try {
    const response = await fetch(HEROS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        httpMethod: "GET",
        pathParameters: {
          hero_id: id,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const payload = await readJsonResponse(response);
    assertSuccessfulApiPayload(payload);

    const hero = parseHeroResponse(payload, fallback);
    if (!isFallbackHero(hero, fallback)) {
      return hero;
    }
  } catch {
    // If single-item GET is not available for heros, try the list endpoint below.
  }

  const heros = await fetchHeros();
  return heros.find((hero) => hero.id === id) ?? fallback;
};

export const updateHero = async (heroItem: HeroItem): Promise<HeroItem> => {
  const payload = await postHeroMutationEvent(toHeroMutationEvent("PUT", heroItem));
  return payload ? parseHeroResponse(payload, heroItem) : heroItem;
};

export const createHero = async (heroItem: HeroItem): Promise<HeroItem> => {
  const heroToCreate = {
    ...heroItem,
    id: heroItem.id || generateGuid(),
  };

  const payload = await postHeroMutationEvent(toHeroMutationEvent("POST", heroToCreate));
  return payload ? parseHeroResponse(payload, heroToCreate) : heroToCreate;
};

export const loadHeros = (): HeroItem[] => {
  if (typeof window === "undefined") {
    return cloneHeros(seedHeros);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = cloneHeros(seedHeros);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as HeroItem[];
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid heros payload");
    }

    return parsed.map((hero) => ({
      id: String(hero.id),
      title: String(hero.title ?? ""),
      button: String(hero.button ?? ""),
      call: String(hero.call ?? ""),
      date: String(hero.date ?? ""),
      enabled: hero.enabled === 1 ? (1 as const) : (0 as const),
      image: String(hero.image ?? ""),
    }));
  } catch {
    const initial = cloneHeros(seedHeros);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

export const saveHeros = (heros: HeroItem[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(heros));
};

export const upsertHero = (heroItem: HeroItem) => {
  const heros = loadHeros();
  const index = heros.findIndex((item) => item.id === heroItem.id);

  if (index >= 0) {
    heros[index] = heroItem;
  } else {
    heros.unshift(heroItem);
  }

  saveHeros(heros);
};

export const createEmptyHero = (id = generateGuid()): HeroItem => ({
  id,
  title: "",
  button: "",
  call: "",
  date: "",
  enabled: 1,
  image: "",
});
