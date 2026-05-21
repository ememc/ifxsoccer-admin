import { URL_API_BASE } from "../../../config/api";
import { generateGuid } from "../../../utils/guid";

export interface CategoryHero {
  image_text: string;
  image_url: string;
}

export interface CategorySection {
  section_image: string;
  section_order: string;
  section_text: string;
  section_title: string;
}

export interface CategoryDetail {
  detail_file: string;
  detail_text: string;
  detail_title: string;
}

export interface CategoryAddon {
  addons_cost: string;
  addons_description: string;
  addons_title: string;
}

export interface CategoryVariation {
  variations_cost: string;
  variations_dates: string;
  variations_deadline: string;
  variations_description: string;
}

export interface CategoryPlayer {
  player_description: string;
  player_image: string;
  player_says: string;
}

export interface CategoryInformation {
  information_title: string;
  information_text: string;
}

export interface Category {
  category_id: string;
  category_addons: CategoryAddon[];
  category_apply: string;
  category_category: string;
  category_date: string;
  category_description: string;
  category_details: CategoryDetail[];
  category_enabled: boolean | number | string;
  category_hero: CategoryHero[];
  category_information: CategoryInformation[];
  category_players: CategoryPlayer[];
  category_section: CategorySection[];
  category_status: string;
  category_title: string;
  category_variations: CategoryVariation[];
}

interface ApiCategory {
  category_id?: unknown;
  category_addons?: unknown;
  category_apply?: unknown;
  category_category?: unknown;
  category_date?: unknown;
  category_description?: unknown;
  category_details?: unknown;
  category_enabled?: unknown;
  category_hero?: unknown;
  category_information?: unknown;
  category_players?: unknown;
  category_section?: unknown;
  category_status?: unknown;
  category_title?: unknown;
  category_variations?: unknown;
}

interface IndexedCategory extends Category {
  sourceIndex: number;
}

export const CATEGORIES_API_URL = `${URL_API_BASE.replace(/\/+$/, "")}/category/`;

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

const unwrapDynamoObject = (
  value: Record<string, unknown>
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, unwrapDynamoValue(entry)])
  );

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

  if ("L" in value && Array.isArray(value.L)) {
    return value.L.map(unwrapDynamoValue);
  }

  if ("M" in value && isRecord(value.M)) {
    return unwrapDynamoObject(value.M);
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

export const normalizeEnabled = (
  value: Category["category_enabled"]
): 0 | 1 => {
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

const stringValue = (value: unknown): string =>
  String(unwrapDynamoValue(value) ?? "");

const normalizeArray = <T,>(
  value: unknown,
  mapper: (item: Record<string, unknown>) => T
): T[] => {
  const unwrapped = unwrapDynamoValue(value);

  if (!Array.isArray(unwrapped)) {
    return [];
  }

  return unwrapped.map((item) => {
    const raw = unwrapDynamoValue(item);
    return mapper(isRecord(raw) ? raw : {});
  });
};

const extractApiCategories = (payload: unknown): ApiCategory[] => {
  const bodyPayload = parseApiBody(payload);

  if (Array.isArray(bodyPayload)) {
    return bodyPayload as ApiCategory[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.category)) {
    return bodyPayload.category as ApiCategory[];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.category)) {
    return [bodyPayload.category as ApiCategory];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.categories)) {
    return bodyPayload.categories as ApiCategory[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.items)) {
    return bodyPayload.items as ApiCategory[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.Items)) {
    return bodyPayload.Items as ApiCategory[];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.item)) {
    return [bodyPayload.item as ApiCategory];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.Item)) {
    return [bodyPayload.Item as ApiCategory];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.data)) {
    return [bodyPayload.data as ApiCategory];
  }

  if (isRecord(payload) && Array.isArray(payload.category)) {
    return payload.category as ApiCategory[];
  }

  if (isRecord(payload) && isRecord(payload.category)) {
    return [payload.category as ApiCategory];
  }

  if (isRecord(payload) && Array.isArray(payload.categories)) {
    return payload.categories as ApiCategory[];
  }

  return [];
};

const toApiCategoryBody = (category: Category): ApiCategory => ({
  category_id: category.category_id,
  category_addons: category.category_addons,
  category_apply: category.category_apply,
  category_category: category.category_category,
  category_date: category.category_date,
  category_description: category.category_description,
  category_details: category.category_details,
  category_enabled: normalizeEnabled(category.category_enabled) === 1,
  category_hero: category.category_hero,
  category_information: category.category_information,
  category_players: category.category_players,
  category_section: category.category_section,
  category_status: category.category_status,
  category_title: category.category_title,
  category_variations: category.category_variations,
});

const toCategoryMutationEvent = (
  httpMethod: "POST" | "PUT" | "DELETE",
  category: Category
) => ({
  httpMethod,
  pathParameters: {
    category_id: category.category_id,
  },
  body: JSON.stringify(toApiCategoryBody(category)),
});

const isCorsLikeFailure = (error: unknown): boolean =>
  error instanceof TypeError && /fetch|network|failed/i.test(error.message);

const postCategoryMutationEvent = async (
  mutationEvent: ReturnType<typeof toCategoryMutationEvent>
): Promise<unknown | null> => {
  const requestBody = JSON.stringify(mutationEvent);

  try {
    const response = await fetch(CATEGORIES_API_URL, {
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

    await fetch(CATEGORIES_API_URL, {
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

export const parseCategoriesResponse = (payload: unknown): Category[] => {
  const indexedCategories: IndexedCategory[] = extractApiCategories(payload).map(
    (category, sourceIndex) => ({
      category_id: stringValue(category.category_id || `category-${sourceIndex}`),
      category_addons: normalizeArray(category.category_addons, (item) => ({
        addons_cost: stringValue(item.addons_cost),
        addons_description: stringValue(item.addons_description),
        addons_title: stringValue(item.addons_title),
      })),
      category_apply: stringValue(category.category_apply),
      category_category: stringValue(category.category_category),
      category_date: normalizeApiDate(category.category_date),
      category_description: stringValue(category.category_description),
      category_details: normalizeArray(category.category_details, (item) => ({
        detail_file: stringValue(item.detail_file),
        detail_text: stringValue(item.detail_text),
        detail_title: stringValue(item.detail_title),
      })),
      category_enabled: unwrapDynamoValue(
        category.category_enabled
      ) as Category["category_enabled"],
      category_hero: normalizeArray(category.category_hero, (item) => ({
        image_text: stringValue(item.image_text),
        image_url: stringValue(item.image_url),
      })),
      category_information: normalizeArray(category.category_information, (item) => ({
        information_title: stringValue(item.information_title),
        information_text: stringValue(item.information_text),
      })),
      category_players: normalizeArray(category.category_players, (item) => ({
        player_description: stringValue(item.player_description),
        player_image: stringValue(item.player_image),
        player_says: stringValue(item.player_says),
      })),
      category_section: normalizeArray(category.category_section, (item) => ({
        section_image: stringValue(item.section_image),
        section_order: stringValue(item.section_order),
        section_text: stringValue(item.section_text),
        section_title: stringValue(item.section_title),
      })),
      category_status: stringValue(category.category_status),
      category_title: stringValue(category.category_title),
      category_variations: normalizeArray(category.category_variations, (item) => ({
        variations_cost: stringValue(item.variations_cost),
        variations_dates: stringValue(item.variations_dates),
        variations_deadline: stringValue(item.variations_deadline),
        variations_description: stringValue(item.variations_description),
      })),
      sourceIndex,
    })
  );

  return indexedCategories
    .sort((first, second) => {
      if (first.category_date !== second.category_date) {
        return second.category_date.localeCompare(first.category_date);
      }

      return first.sourceIndex - second.sourceIndex;
    })
    .map(({ sourceIndex: _sourceIndex, ...category }) => category);
};

const parseCategoryResponse = (payload: unknown, fallback: Category): Category => {
  const categories = parseCategoriesResponse(payload);
  return (
    categories.find((category) => category.category_id === fallback.category_id) ??
    categories[0] ??
    fallback
  );
};

const isFallbackCategory = (category: Category, fallback: Category): boolean =>
  JSON.stringify(category) === JSON.stringify(fallback);

export const fetchCategories = async (): Promise<Category[]> => {
  const response = await fetch(CATEGORIES_API_URL);

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseCategoriesResponse(payload);
};

export const fetchCategory = async (id: string): Promise<Category> => {
  const fallback = createEmptyCategory(id);

  try {
    const response = await fetch(CATEGORIES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        httpMethod: "GET",
        pathParameters: {
          category_id: id,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const payload = await readJsonResponse(response);
    assertSuccessfulApiPayload(payload);

    const category = parseCategoryResponse(payload, fallback);
    if (!isFallbackCategory(category, fallback)) {
      return category;
    }
  } catch {
    // If single-item GET is not available for categories, try the list endpoint below.
  }

  const categories = await fetchCategories();
  return categories.find((category) => category.category_id === id) ?? fallback;
};

export const updateCategory = async (category: Category): Promise<Category> => {
  const payload = await postCategoryMutationEvent(
    toCategoryMutationEvent("PUT", category)
  );
  return payload ? parseCategoryResponse(payload, category) : category;
};

export const createCategory = async (category: Category): Promise<Category> => {
  const categoryToCreate = {
    ...category,
    category_id: category.category_id || generateGuid(),
  };

  const payload = await postCategoryMutationEvent(
    toCategoryMutationEvent("POST", categoryToCreate)
  );
  return payload ? parseCategoryResponse(payload, categoryToCreate) : categoryToCreate;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await postCategoryMutationEvent(
    toCategoryMutationEvent("DELETE", createEmptyCategory(id))
  );
};

export const createEmptyCategoryHero = (): CategoryHero => ({
  image_text: "",
  image_url: "",
});

export const createEmptyCategorySection = (index: number): CategorySection => ({
  section_image: "",
  section_order: String(index + 1),
  section_text: "",
  section_title: "",
});

export const createEmptyCategoryDetail = (): CategoryDetail => ({
  detail_file: "",
  detail_text: "",
  detail_title: "",
});

export const createEmptyCategoryAddon = (): CategoryAddon => ({
  addons_cost: "",
  addons_description: "",
  addons_title: "",
});

export const createEmptyCategoryVariation = (): CategoryVariation => ({
  variations_cost: "",
  variations_dates: "",
  variations_deadline: "",
  variations_description: "",
});

export const createEmptyCategoryPlayer = (): CategoryPlayer => ({
  player_description: "",
  player_image: "",
  player_says: "",
});

export const createEmptyCategoryInformation = (): CategoryInformation => ({
  information_title: "",
  information_text: "",
});

export const createEmptyCategory = (id = generateGuid()): Category => ({
  category_id: id,
  category_addons: [createEmptyCategoryAddon()],
  category_apply: "",
  category_category: "",
  category_date: "",
  category_description: "",
  category_details: [createEmptyCategoryDetail()],
  category_enabled: true,
  category_hero: [createEmptyCategoryHero()],
  category_information: [],
  category_players: [createEmptyCategoryPlayer()],
  category_section: [createEmptyCategorySection(0)],
  category_status: "published",
  category_title: "",
  category_variations: [createEmptyCategoryVariation()],
});
