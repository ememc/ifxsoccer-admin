import { URL_API_BASE } from "../../../config/api";
import { getTodayDateInputValue } from "../../../utils/date";
import { generateGuid } from "../../../utils/guid";

export interface CategoryProgram {
  program_id: string;
  program_order: string;
  program_status: string | number | boolean;
}

export interface CategorySection {
  section_image: string;
  section_order: string;
  section_text: string;
  section_title: string;
}

export interface CategoryVideo {
  video_id: string;
  video_order: number;
}

export interface CategoryImage {
  image_id: string;
  image_order: number;
}

export interface Category {
  category_id: string;
  category_head: string;
  category_image: string;
  category_title: string;
  category_subtitle: string;
  category_description: string;
  category_text: string;
  category_programs: CategoryProgram[];
  category_section: string | number | boolean;
  category_sections: CategorySection[];
  category_videos: CategoryVideo[];
  category_images: CategoryImage[];
  category_apply: string;
  category_date: string;
  category_enabled: string | number | boolean;
  category_status: string | number | boolean;
}

interface ApiCategory {
  category_apply?: unknown;
  category_camps?: unknown;
  category_programs?: unknown;
  category_date?: unknown;
  category_description?: unknown;
  category_enabled?: unknown;
  category_head?: unknown;
  category_image?: unknown;
  category_id?: unknown;
  category_images?: unknown;
  category_section?: unknown;
  category_sections?: unknown;
  category_status?: unknown;
  category_subtitle?: unknown;
  category_text?: unknown;
  category_title?: unknown;
  category_videos?: unknown;
}

interface IndexedCategory extends Category {
  sourceIndex: number;
}

export const CATEGORY_API_URL = `${URL_API_BASE.replace(/\/+$/, "")}/category`;

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

const unwrapDynamoObject = (value: Record<string, unknown>): Record<string, unknown> =>
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

const stringValue = (value: unknown): string => String(unwrapDynamoValue(value) ?? "");

const firstDefinedValue = (...values: unknown[]): unknown =>
  values.find((value) => unwrapDynamoValue(value) !== undefined);

const numberValue = (value: unknown, fallback = 0): number => {
  const numericValue = Number(unwrapDynamoValue(value));
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeApiDate = (value: unknown): string => {
  const date = String(unwrapDynamoValue(value) ?? "");
  const dayMonthYear = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!dayMonthYear) {
    return date;
  }

  return `${dayMonthYear[3]}-${dayMonthYear[2]}-${dayMonthYear[1]}`;
};

export const normalizeEnabled = (value: Category["category_enabled"]): 0 | 1 => {
  const enabled = unwrapDynamoValue(value);

  if (
    enabled === 1 ||
    enabled === true ||
    enabled === "1" ||
    String(enabled).toLowerCase() === "true" ||
    String(enabled).toLowerCase() === "active" ||
    String(enabled).toLowerCase() === "enabled"
  ) {
    return 1;
  }

  return 0;
};

const normalizeArray = <T>(
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
  category_apply: category.category_apply,
  category_programs: category.category_programs.map((item) => ({
    program_id: item.program_id,
    program_order: item.program_order,
    program_status: normalizeEnabled(item.program_status) === 1,
  })),
  category_date: category.category_date,
  category_description: category.category_description,
  category_enabled: normalizeEnabled(category.category_enabled) === 1,
  category_head: category.category_head,
  category_image: category.category_image,
  category_id: category.category_id,
  category_images: category.category_images,
  category_section: normalizeEnabled(category.category_section) === 1,
  category_sections: category.category_sections,
  category_status: normalizeEnabled(category.category_status) === 1,
  category_subtitle: category.category_subtitle,
  category_text: category.category_text,
  category_title: category.category_title,
  category_videos: category.category_videos,
});

const toCategoryMutationEvent = (httpMethod: "POST" | "PUT", category: Category) => ({
  body: JSON.stringify(toApiCategoryBody(category)),
  httpMethod,
  pathParameters: {
    category_id: category.category_id,
  },
});

const isCorsLikeFailure = (error: unknown): boolean =>
  error instanceof TypeError && /fetch|network|failed/i.test(error.message);

const postCategoryMutationEvent = async (
  mutationEvent: ReturnType<typeof toCategoryMutationEvent>
): Promise<unknown | null> => {
  const requestBody = JSON.stringify(mutationEvent);

  try {
    const response = await fetch(CATEGORY_API_URL, {
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

    await fetch(CATEGORY_API_URL, {
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
      category_apply: stringValue(category.category_apply),
      category_programs: normalizeArray(
        firstDefinedValue(category.category_programs, category.category_camps),
        (item) => ({
        program_id: stringValue(item.program_id),
        program_order: stringValue(item.program_order || String(sourceIndex + 1)),
        program_status: (unwrapDynamoValue(
          firstDefinedValue(item.program_status, item.program_enabled, true)
        ) ?? true) as string | number | boolean,
      })
      ),
      category_date: normalizeApiDate(category.category_date),
      category_description: stringValue(category.category_description),
      category_enabled: unwrapDynamoValue(category.category_enabled) as
        | string
        | number
        | boolean,
      category_head: stringValue(category.category_head),
      category_image: stringValue(category.category_image),
      category_id: stringValue(category.category_id || `category-${sourceIndex}`),
      category_images: normalizeArray(category.category_images, (item) => ({
        image_id: stringValue(item.image_id),
        image_order: numberValue(item.image_order, sourceIndex + 1),
      })),
      category_section: (Array.isArray(unwrapDynamoValue(category.category_section))
        ? true
        : unwrapDynamoValue(firstDefinedValue(category.category_section, true)) ?? true) as
        | string
        | number
        | boolean,
      category_sections: normalizeArray(
        firstDefinedValue(category.category_sections, category.category_section),
        (item) => ({
        section_image: stringValue(item.section_image),
        section_order: stringValue(item.section_order),
        section_text: stringValue(item.section_text),
        section_title: stringValue(item.section_title),
      })
      ),
      category_status: (unwrapDynamoValue(
        firstDefinedValue(category.category_status, true)
      ) ?? true) as string | number | boolean,
      category_subtitle: stringValue(category.category_subtitle),
      category_text: stringValue(category.category_text),
      category_title: stringValue(category.category_title),
      category_videos: normalizeArray(category.category_videos, (item) => ({
        video_id: stringValue(item.video_id),
        video_order: numberValue(item.video_order, sourceIndex + 1),
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
  const response = await fetch(CATEGORY_API_URL);

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
    const response = await fetch(CATEGORY_API_URL, {
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
  const payload = await postCategoryMutationEvent(toCategoryMutationEvent("PUT", category));
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

export const createEmptyCategoryProgram = (order: number): CategoryProgram => ({
  program_id: "",
  program_order: String(order),
  program_status: true,
});

export const createEmptyCategorySection = (index: number): CategorySection => ({
  section_image: "",
  section_order: String(index + 1),
  section_text: "",
  section_title: "",
});

export const createEmptyCategoryVideo = (order: number): CategoryVideo => ({
  video_id: "",
  video_order: order,
});

export const createEmptyCategoryImage = (order: number): CategoryImage => ({
  image_id: "",
  image_order: order,
});

export const createEmptyCategory = (id = generateGuid()): Category => ({
  category_apply: "",
  category_programs: [],
  category_date: getTodayDateInputValue(),
  category_description: "",
  category_enabled: true,
  category_head: "",
  category_image: "",
  category_id: id,
  category_images: [],
  category_section: true,
  category_sections: [createEmptyCategorySection(0)],
  category_status: true,
  category_subtitle: "",
  category_text: "",
  category_title: "",
  category_videos: [],
});
