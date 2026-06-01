import { URL_API_BASE } from "../../../config/api";
import { getTodayDateInputValue } from "../../../utils/date";
import { generateGuid } from "../../../utils/guid";

export interface DestinationHero {
  image_text: string;
  image_url: string;
}

export interface DestinationSection {
  section_image: string;
  section_order: string;
  section_text: string;
  section_title: string;
}

export interface DestinationCity {
  city_image: string;
  city_order: string;
  city_text: string;
  city_title: string;
}

export interface DestinationAcademy {
  academy_image: string;
  academy_order: string;
  academy_text: string;
  academy_title: string;
  academy_target: string;
}

export interface Destination {
  destination_id: string;
  destination_category: string;
  destination_date: string;
  destination_title: string;
  destination_description: string;
  destination_hero: DestinationHero[];
  destination_section: DestinationSection[];
  destination_cities: DestinationCity[];
  destination_academies: DestinationAcademy[];
  destination_state: string | number | boolean;
  destination_tags: string;
  destination_text: string;
}

interface ApiDestination {
  destination_id?: unknown;
  destination_category?: unknown;
  destination_date?: unknown;
  destination_title?: unknown;
  destination_description?: unknown;
  destination_hero?: unknown;
  destination_section?: unknown;
  destination_cities?: unknown;
  destination_academies?: unknown;
  destination_state?: unknown;
  destination_tags?: unknown;
  destination_text?: unknown;
}

interface IndexedDestination extends Destination {
  sourceIndex: number;
}

export const DESTINATIONS_API_URL = `${URL_API_BASE.replace(/\/+$/, "")}/destination/`;

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

const normalizeApiDate = (value: unknown): string => {
  const date = String(unwrapDynamoValue(value) ?? "");
  const dayMonthYear = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!dayMonthYear) {
    return date;
  }

  return `${dayMonthYear[3]}-${dayMonthYear[2]}-${dayMonthYear[1]}`;
};

export const normalizeEnabled = (value: Destination["destination_state"]): 0 | 1 => {
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

const stringValue = (value: unknown): string => String(unwrapDynamoValue(value) ?? "");

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

const extractApiDestinations = (payload: unknown): ApiDestination[] => {
  const bodyPayload = parseApiBody(payload);

  if (Array.isArray(bodyPayload)) {
    return bodyPayload as ApiDestination[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.destination)) {
    return bodyPayload.destination as ApiDestination[];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.destination)) {
    return [bodyPayload.destination as ApiDestination];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.destinations)) {
    return bodyPayload.destinations as ApiDestination[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.items)) {
    return bodyPayload.items as ApiDestination[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.Items)) {
    return bodyPayload.Items as ApiDestination[];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.item)) {
    return [bodyPayload.item as ApiDestination];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.Item)) {
    return [bodyPayload.Item as ApiDestination];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.data)) {
    return [bodyPayload.data as ApiDestination];
  }

  if (isRecord(payload) && Array.isArray(payload.destination)) {
    return payload.destination as ApiDestination[];
  }

  if (isRecord(payload) && isRecord(payload.destination)) {
    return [payload.destination as ApiDestination];
  }

  if (isRecord(payload) && Array.isArray(payload.destinations)) {
    return payload.destinations as ApiDestination[];
  }

  return [];
};

const toApiDestinationBody = (destination: Destination): ApiDestination => ({
  destination_id: destination.destination_id,
  destination_category: destination.destination_category,
  destination_date: destination.destination_date,
  destination_title: destination.destination_title,
  destination_description: destination.destination_description,
  destination_hero: destination.destination_hero,
  destination_section: destination.destination_section,
  destination_cities: destination.destination_cities,
  destination_academies: destination.destination_academies,
  destination_state: normalizeEnabled(destination.destination_state) === 1,
  destination_tags: destination.destination_tags,
  destination_text: destination.destination_text,
});

const toDestinationMutationEvent = (
  httpMethod: "POST" | "PUT",
  destination: Destination
) => ({
  httpMethod,
  pathParameters: {
    destination_id: destination.destination_id,
  },
  body: JSON.stringify(toApiDestinationBody(destination)),
});

const isCorsLikeFailure = (error: unknown): boolean =>
  error instanceof TypeError && /fetch|network|failed/i.test(error.message);

const postDestinationMutationEvent = async (
  mutationEvent: ReturnType<typeof toDestinationMutationEvent>
): Promise<unknown | null> => {
  const requestBody = JSON.stringify(mutationEvent);

  try {
    const response = await fetch(DESTINATIONS_API_URL, {
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

    await fetch(DESTINATIONS_API_URL, {
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

export const parseDestinationsResponse = (payload: unknown): Destination[] => {
  const indexedDestinations: IndexedDestination[] = extractApiDestinations(payload).map(
    (destination, sourceIndex) => ({
      destination_id: stringValue(destination.destination_id || `destination-${sourceIndex}`),
      destination_category: stringValue(destination.destination_category),
      destination_date: normalizeApiDate(destination.destination_date),
      destination_title: stringValue(destination.destination_title),
      destination_description: stringValue(destination.destination_description),
      destination_hero: normalizeArray(destination.destination_hero, (item) => ({
        image_text: stringValue(item.image_text),
        image_url: stringValue(item.image_url),
      })),
      destination_section: normalizeArray(destination.destination_section, (item) => ({
        section_image: stringValue(item.section_image),
        section_order: stringValue(item.section_order),
        section_text: stringValue(item.section_text),
        section_title: stringValue(item.section_title),
      })),
      destination_cities: normalizeArray(destination.destination_cities, (item) => ({
        city_image: stringValue(item.city_image),
        city_order: stringValue(item.city_order),
        city_text: stringValue(item.city_text),
        city_title: stringValue(item.city_title),
      })),
      destination_academies: normalizeArray(destination.destination_academies, (item) => ({
        academy_image: stringValue(item.academy_image),
        academy_order: stringValue(item.academy_order),
        academy_text: stringValue(item.academy_text),
        academy_title: stringValue(item.academy_title),
        academy_target: stringValue(item.academy_target),
      })),
      destination_state: unwrapDynamoValue(destination.destination_state) as Destination["destination_state"],
      destination_tags: stringValue(destination.destination_tags),
      destination_text: stringValue(destination.destination_text),
      sourceIndex,
    })
  );

  return indexedDestinations
    .sort((first, second) => {
      if (first.destination_date !== second.destination_date) {
        return second.destination_date.localeCompare(first.destination_date);
      }

      return first.sourceIndex - second.sourceIndex;
    })
    .map(({ sourceIndex: _sourceIndex, ...destination }) => destination);
};

const parseDestinationResponse = (payload: unknown, fallback: Destination): Destination => {
  const destinations = parseDestinationsResponse(payload);
  return (
    destinations.find(
      (destination) => destination.destination_id === fallback.destination_id
    ) ??
    destinations[0] ??
    fallback
  );
};

const isFallbackDestination = (destination: Destination, fallback: Destination): boolean =>
  JSON.stringify(destination) === JSON.stringify(fallback);

export const fetchDestinations = async (): Promise<Destination[]> => {
  const response = await fetch(DESTINATIONS_API_URL);

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseDestinationsResponse(payload);
};

export const fetchDestination = async (id: string): Promise<Destination> => {
  const fallback = createEmptyDestination(id);

  try {
    const response = await fetch(DESTINATIONS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        httpMethod: "GET",
        pathParameters: {
          destination_id: id,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const payload = await readJsonResponse(response);
    assertSuccessfulApiPayload(payload);

    const destination = parseDestinationResponse(payload, fallback);
    if (!isFallbackDestination(destination, fallback)) {
      return destination;
    }
  } catch {
    // If single-item GET is not available for destinations, try the list endpoint below.
  }

  const destinations = await fetchDestinations();
  return (
    destinations.find((destination) => destination.destination_id === id) ?? fallback
  );
};

export const updateDestination = async (
  destination: Destination
): Promise<Destination> => {
  const payload = await postDestinationMutationEvent(
    toDestinationMutationEvent("PUT", destination)
  );
  return payload ? parseDestinationResponse(payload, destination) : destination;
};

export const createDestination = async (
  destination: Destination
): Promise<Destination> => {
  const destinationToCreate = {
    ...destination,
    destination_id: destination.destination_id || generateGuid(),
  };

  const payload = await postDestinationMutationEvent(
    toDestinationMutationEvent("POST", destinationToCreate)
  );
  return payload
    ? parseDestinationResponse(payload, destinationToCreate)
    : destinationToCreate;
};

export const createEmptyDestinationHero = (): DestinationHero => ({
  image_text: "",
  image_url: "",
});

export const createEmptyDestinationSection = (index: number): DestinationSection => ({
  section_image: "",
  section_order: String(index + 1),
  section_text: "",
  section_title: "",
});

export const createEmptyDestinationCity = (index: number): DestinationCity => ({
  city_image: "",
  city_order: String(index + 1),
  city_text: "",
  city_title: "",
});

export const createEmptyDestinationAcademy = (
  index: number
): DestinationAcademy => ({
  academy_image: "",
  academy_order: String(index + 1),
  academy_text: "",
  academy_title: "",
  academy_target: "",
});

export const createEmptyDestination = (id = generateGuid()): Destination => ({
  destination_id: id,
  destination_category: "",
  destination_date: getTodayDateInputValue(),
  destination_title: "",
  destination_description: "",
  destination_hero: [createEmptyDestinationHero()],
  destination_section: [createEmptyDestinationSection(0)],
  destination_cities: [createEmptyDestinationCity(0)],
  destination_academies: [createEmptyDestinationAcademy(0)],
  destination_state: true,
  destination_tags: "",
  destination_text: "",
});
