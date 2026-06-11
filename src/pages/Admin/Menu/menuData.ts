import { URL_API_BASE } from "../../../config/api";
import { generateGuid } from "../../../utils/guid";

export interface MenuDetail {
  detail_id: string;
  detail_title: string;
  section_image: string;
  section_call: string;
  section_target: string;
  section_order: number;
}

export interface MenuSection {
  section_id: string;
  section_title: string;
  section_image: string;
  section_call: string;
  section_target: string;
  section_order: number;
  section_detail: boolean;
  menu_detail: MenuDetail[];
}

export interface MenuHeader {
  header_id: string;
  header_text: string;
  header_enabled: boolean | number | string;
  header_order: number;
  header_call: string;
  header_target: string;
  menu_section: MenuSection[];
}

export interface MenuItem {
  menu_id: string;
  menu_header: MenuHeader[];
}

interface ApiMenuItem {
  menu_id?: unknown;
  menu_header?: unknown;
}

interface IndexedMenuItem extends MenuItem {
  sourceIndex: number;
}

export const MENU_API_URL = `${URL_API_BASE.replace(/\/+$/, "")}/menu/`;

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

const numberValue = (value: unknown, fallback = 0): number => {
  const raw = unwrapDynamoValue(value);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeEnabled = (value: MenuHeader["header_enabled"]): 0 | 1 => {
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

const normalizeArray = <T,>(
  value: unknown,
  mapper: (item: Record<string, unknown>, index: number) => T
): T[] => {
  const unwrapped = unwrapDynamoValue(value);

  if (!Array.isArray(unwrapped)) {
    return [];
  }

  return unwrapped.map((item, index) => {
    const raw = unwrapDynamoValue(item);
    return mapper(isRecord(raw) ? raw : {}, index);
  });
};

const extractApiMenus = (payload: unknown): ApiMenuItem[] => {
  const bodyPayload = parseApiBody(payload);

  if (Array.isArray(bodyPayload)) {
    return bodyPayload as ApiMenuItem[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.menu)) {
    return bodyPayload.menu as ApiMenuItem[];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.menu)) {
    return [bodyPayload.menu as ApiMenuItem];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.menus)) {
    return bodyPayload.menus as ApiMenuItem[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.items)) {
    return bodyPayload.items as ApiMenuItem[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.Items)) {
    return bodyPayload.Items as ApiMenuItem[];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.item)) {
    return [bodyPayload.item as ApiMenuItem];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.Item)) {
    return [bodyPayload.Item as ApiMenuItem];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.data)) {
    return [bodyPayload.data as ApiMenuItem];
  }

  if (isRecord(payload) && Array.isArray(payload.menu)) {
    return payload.menu as ApiMenuItem[];
  }

  if (isRecord(payload) && isRecord(payload.menu)) {
    return [payload.menu as ApiMenuItem];
  }

  if (isRecord(payload) && Array.isArray(payload.menus)) {
    return payload.menus as ApiMenuItem[];
  }

  return [];
};

const toApiMenuBody = (menu: MenuItem): ApiMenuItem => ({
  menu_id: menu.menu_id,
  menu_header: menu.menu_header.map((header) => ({
    header_id: header.header_id,
    header_text: header.header_text,
    header_enabled: normalizeEnabled(header.header_enabled) === 1,
    header_order: header.header_order,
    header_call: header.header_call,
    header_target: header.header_target,
    menu_section: header.menu_section.map((section) => ({
      section_id: section.section_id,
      section_title: section.section_title,
      section_image: section.section_image,
      section_call: section.section_call,
      section_target: section.section_target,
      section_order: section.section_order,
      section_detail: section.section_detail,
      menu_detail: section.menu_detail.map((detail) => ({
        detail_id: detail.detail_id,
        detail_title: detail.detail_title,
        section_image: detail.section_image,
        section_call: detail.section_call,
        section_target: detail.section_target,
        section_order: detail.section_order,
      })),
    })),
  })),
});

const toMenuMutationEvent = (httpMethod: "POST" | "PUT", menu: MenuItem) => ({
  httpMethod,
  pathParameters: {
    menu_id: menu.menu_id,
  },
  body: JSON.stringify(toApiMenuBody(menu)),
});

const isCorsLikeFailure = (error: unknown): boolean =>
  error instanceof TypeError && /fetch|network|failed/i.test(error.message);

const postMenuMutationEvent = async (
  mutationEvent: ReturnType<typeof toMenuMutationEvent>
): Promise<unknown | null> => {
  const requestBody = JSON.stringify(mutationEvent);

  try {
    const response = await fetch(MENU_API_URL, {
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

    await fetch(MENU_API_URL, {
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

export const parseMenusResponse = (payload: unknown): MenuItem[] => {
  const indexedMenus: IndexedMenuItem[] = extractApiMenus(payload).map((menu, sourceIndex) => ({
    menu_id: stringValue(menu.menu_id || `menu-${sourceIndex}`),
    menu_header: normalizeArray(menu.menu_header, (header, headerIndex) => ({
      header_id: stringValue(header.header_id || `header-${headerIndex}`),
      header_text: stringValue(header.header_text),
      header_enabled: unwrapDynamoValue(header.header_enabled) as MenuHeader["header_enabled"],
      header_order: numberValue(header.header_order, headerIndex + 1),
      header_call: stringValue(header.header_call),
      header_target: stringValue(header.header_target || "_self"),
      menu_section: normalizeArray(header.menu_section, (section, sectionIndex) => ({
        section_id: stringValue(section.section_id || `section-${sectionIndex}`),
        section_title: stringValue(section.section_title),
        section_image: stringValue(section.section_image),
        section_call: stringValue(section.section_call),
        section_target: stringValue(section.section_target || "_self"),
        section_order: numberValue(section.section_order, sectionIndex + 1),
        section_detail:
          unwrapDynamoValue(section.section_detail) === true ||
          unwrapDynamoValue(section.section_detail) === 1 ||
          String(unwrapDynamoValue(section.section_detail)).toLowerCase() === "true",
        menu_detail: normalizeArray(section.menu_detail, (detail, detailIndex) => ({
          detail_id: stringValue(detail.detail_id || `detail-${detailIndex}`),
          detail_title: stringValue(detail.detail_title),
          section_image: stringValue(detail.section_image),
          section_call: stringValue(detail.section_call),
          section_target: stringValue(detail.section_target || "_self"),
          section_order: numberValue(detail.section_order, detailIndex + 1),
        })),
      })),
    })),
    sourceIndex,
  }));

  return indexedMenus
    .sort((first, second) => {
      const firstOrder = first.menu_header[0]?.header_order ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = second.menu_header[0]?.header_order ?? Number.MAX_SAFE_INTEGER;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return first.sourceIndex - second.sourceIndex;
    })
    .map(({ sourceIndex: _sourceIndex, ...menu }) => menu);
};

const parseMenuResponse = (payload: unknown, fallback: MenuItem): MenuItem => {
  const menus = parseMenusResponse(payload);

  return menus.find((menu) => menu.menu_id === fallback.menu_id) ?? menus[0] ?? fallback;
};

const isFallbackMenu = (menu: MenuItem, fallback: MenuItem): boolean =>
  JSON.stringify(menu) === JSON.stringify(fallback);

export const fetchMenus = async (): Promise<MenuItem[]> => {
  const response = await fetch(MENU_API_URL);

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseMenusResponse(payload);
};

export const fetchMenu = async (id: string): Promise<MenuItem> => {
  const fallback = createEmptyMenu(id);

  try {
    const response = await fetch(MENU_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        httpMethod: "GET",
        pathParameters: {
          menu_id: id,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const payload = await readJsonResponse(response);
    assertSuccessfulApiPayload(payload);

    const menu = parseMenuResponse(payload, fallback);
    if (!isFallbackMenu(menu, fallback)) {
      return menu;
    }
  } catch {
    // If the single-item endpoint is not available, fall back to the list endpoint.
  }

  const menus = await fetchMenus();
  return menus.find((menu) => menu.menu_id === id) ?? fallback;
};

export const updateMenu = async (menu: MenuItem): Promise<MenuItem> => {
  const payload = await postMenuMutationEvent(toMenuMutationEvent("PUT", menu));
  return payload ? parseMenuResponse(payload, menu) : menu;
};

export const createMenu = async (menu: MenuItem): Promise<MenuItem> => {
  const menuToCreate = {
    ...menu,
    menu_id: menu.menu_id || generateGuid(),
  };

  const payload = await postMenuMutationEvent(toMenuMutationEvent("POST", menuToCreate));
  return payload ? parseMenuResponse(payload, menuToCreate) : menuToCreate;
};

export const createEmptyMenuDetail = (order = 1): MenuDetail => ({
  detail_id: generateGuid(),
  detail_title: "",
  section_image: "",
  section_call: "#",
  section_target: "_self",
  section_order: order,
});

export const createEmptyMenuSection = (order = 1): MenuSection => ({
  section_id: generateGuid(),
  section_title: "",
  section_image: "",
  section_call: "#",
  section_target: "_self",
  section_order: order,
  section_detail: true,
  menu_detail: [createEmptyMenuDetail(1)],
});

export const createEmptyMenuHeader = (order = 1): MenuHeader => ({
  header_id: generateGuid(),
  header_text: "",
  header_enabled: true,
  header_order: order,
  header_call: "#",
  header_target: "_blank",
  menu_section: [createEmptyMenuSection(1)],
});

export const createEmptyMenu = (id = generateGuid()): MenuItem => ({
  menu_id: id,
  menu_header: [createEmptyMenuHeader(1)],
});
