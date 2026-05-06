import { URL_API_BASE } from "../../../config/api";
import { generateGuid } from "../../../utils/guid";

export interface ProgramHero {
  image_url: string;
  image_text: string;
}

export interface ProgramSection {
  section_image: string;
  section_title: string;
  section_text: string;
  section_order: string;
}

export interface ProgramPlayer {
  player_image: string;
  player_says: string;
  player_description: string;
}

export interface ProgramDetail {
  detail_title: string;
  detail_text: string;
  detail_file: string;
}

export interface ProgramVariation {
  variations_description: string;
  variations_dates: string;
  variations_cost: string;
  variations_deadline: string;
}

export interface ProgramAddon {
  addons_title: string;
  addons_description: string;
  addons_cost: string;
}

export interface ProgramInformation {
  information_title: string;
  information_image: string;
  information_url: string;
}

export interface Program {
  program_id: string;
  program_hero: ProgramHero[];
  program_title: string;
  program_description: string;
  program_section: ProgramSection[];
  program_players: ProgramPlayer[];
  program_details: ProgramDetail[];
  program_variations: ProgramVariation[];
  program_addons: ProgramAddon[];
  program_information: ProgramInformation[];
  program_category: string;
  program_apply: string;
  program_enabled: string | number | boolean;
  program_status: string;
  program_date: string;
}

type ProgramArrayKey =
  | "program_hero"
  | "program_section"
  | "program_players"
  | "program_details"
  | "program_variations"
  | "program_addons"
  | "program_information";

interface ApiProgram {
  program_addons?: unknown;
  program_apply?: unknown;
  program_category?: unknown;
  program_date?: unknown;
  program_description?: unknown;
  program_details?: unknown;
  program_enabled?: unknown;
  program_hero?: unknown;
  program_id?: unknown;
  program_information?: unknown;
  program_players?: unknown;
  program_section?: unknown;
  program_status?: unknown;
  program_title?: unknown;
  program_variations?: unknown;
}

interface IndexedProgram extends Program {
  sourceIndex: number;
}

export const PROGRAMS_API_URL = `${URL_API_BASE.replace(/\/+$/, "")}/programs/`;

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

export const normalizeEnabled = (value: Program["program_enabled"]): 0 | 1 => {
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

const extractApiPrograms = (payload: unknown): ApiProgram[] => {
  const bodyPayload = parseApiBody(payload);

  if (Array.isArray(bodyPayload)) {
    return bodyPayload as ApiProgram[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.program)) {
    return bodyPayload.program as ApiProgram[];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.program)) {
    return [bodyPayload.program as ApiProgram];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.programs)) {
    return bodyPayload.programs as ApiProgram[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.items)) {
    return bodyPayload.items as ApiProgram[];
  }

  if (isRecord(bodyPayload) && Array.isArray(bodyPayload.Items)) {
    return bodyPayload.Items as ApiProgram[];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.item)) {
    return [bodyPayload.item as ApiProgram];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.Item)) {
    return [bodyPayload.Item as ApiProgram];
  }

  if (isRecord(bodyPayload) && isRecord(bodyPayload.data)) {
    return [bodyPayload.data as ApiProgram];
  }

  if (isRecord(payload) && Array.isArray(payload.program)) {
    return payload.program as ApiProgram[];
  }

  if (isRecord(payload) && isRecord(payload.program)) {
    return [payload.program as ApiProgram];
  }

  if (isRecord(payload) && Array.isArray(payload.programs)) {
    return payload.programs as ApiProgram[];
  }

  return [];
};

const toApiProgramBody = (program: Program): ApiProgram => ({
  program_addons: program.program_addons,
  program_apply: program.program_apply,
  program_category: program.program_category,
  program_date: program.program_date,
  program_description: program.program_description,
  program_details: program.program_details,
  program_enabled: normalizeEnabled(program.program_enabled) === 1,
  program_hero: program.program_hero,
  program_id: program.program_id,
  program_information: program.program_information,
  program_players: program.program_players,
  program_section: program.program_section,
  program_status: program.program_status,
  program_title: program.program_title,
  program_variations: program.program_variations,
});

const toProgramMutationEvent = (httpMethod: "POST" | "PUT", program: Program) => ({
  httpMethod,
  pathParameters: {
    program_id: program.program_id,
  },
  body: JSON.stringify(toApiProgramBody(program)),
});

const isCorsLikeFailure = (error: unknown): boolean =>
  error instanceof TypeError && /fetch|network|failed/i.test(error.message);

const postProgramMutationEvent = async (
  mutationEvent: ReturnType<typeof toProgramMutationEvent>
): Promise<unknown | null> => {
  const requestBody = JSON.stringify(mutationEvent);

  try {
    const response = await fetch(PROGRAMS_API_URL, {
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

    await fetch(PROGRAMS_API_URL, {
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

export const parseProgramsResponse = (payload: unknown): Program[] => {
  const indexedPrograms: IndexedProgram[] = extractApiPrograms(payload).map(
    (program, sourceIndex) => ({
      program_id: stringValue(program.program_id || `program-${sourceIndex}`),
      program_hero: normalizeArray(program.program_hero, (item) => ({
        image_url: stringValue(item.image_url),
        image_text: stringValue(item.image_text),
      })),
      program_title: stringValue(program.program_title),
      program_description: stringValue(program.program_description),
      program_section: normalizeArray(program.program_section, (item) => ({
        section_image: stringValue(item.section_image),
        section_title: stringValue(item.section_title),
        section_text: stringValue(item.section_text),
        section_order: stringValue(item.section_order),
      })),
      program_players: normalizeArray(program.program_players, (item) => ({
        player_image: stringValue(item.player_image),
        player_says: stringValue(item.player_says),
        player_description: stringValue(item.player_description),
      })),
      program_details: normalizeArray(program.program_details, (item) => ({
        detail_title: stringValue(item.detail_title),
        detail_text: stringValue(item.detail_text),
        detail_file: stringValue(item.detail_file),
      })),
      program_variations: normalizeArray(program.program_variations, (item) => ({
        variations_description: stringValue(item.variations_description),
        variations_dates: stringValue(item.variations_dates),
        variations_cost: stringValue(item.variations_cost),
        variations_deadline: stringValue(item.variations_deadline),
      })),
      program_addons: normalizeArray(program.program_addons, (item) => ({
        addons_title: stringValue(item.addons_title),
        addons_description: stringValue(item.addons_description),
        addons_cost: stringValue(item.addons_cost),
      })),
      program_information: normalizeArray(program.program_information, (item) => ({
        information_title: stringValue(item.information_title),
        information_image: stringValue(item.information_image),
        information_url: stringValue(item.information_url),
      })),
      program_category: stringValue(program.program_category),
      program_apply: stringValue(program.program_apply),
      program_enabled: unwrapDynamoValue(program.program_enabled) as Program["program_enabled"],
      program_status: stringValue(program.program_status),
      program_date: normalizeApiDate(program.program_date),
      sourceIndex,
    })
  );

  return indexedPrograms
    .sort((first, second) => {
      if (first.program_date !== second.program_date) {
        return second.program_date.localeCompare(first.program_date);
      }

      return first.sourceIndex - second.sourceIndex;
    })
    .map(({ sourceIndex: _sourceIndex, ...program }) => program);
};

const parseProgramResponse = (payload: unknown, fallback: Program): Program => {
  const programs = parseProgramsResponse(payload);
  return programs.find((program) => program.program_id === fallback.program_id) ?? programs[0] ?? fallback;
};

const isFallbackProgram = (program: Program, fallback: Program): boolean =>
  JSON.stringify(program) === JSON.stringify(fallback);

export const fetchPrograms = async (): Promise<Program[]> => {
  const response = await fetch(PROGRAMS_API_URL);

  if (!response.ok) {
    throw new Error(`Error ${response.status}`);
  }

  const payload = await readJsonResponse(response);
  assertSuccessfulApiPayload(payload);

  return parseProgramsResponse(payload);
};

export const fetchProgram = async (id: string): Promise<Program> => {
  const fallback = createEmptyProgram(id);

  try {
    const response = await fetch(PROGRAMS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        httpMethod: "GET",
        pathParameters: {
          program_id: id,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const payload = await readJsonResponse(response);
    assertSuccessfulApiPayload(payload);

    const program = parseProgramResponse(payload, fallback);
    if (!isFallbackProgram(program, fallback)) {
      return program;
    }
  } catch {
    // If single-item GET is not available for programs, try the list endpoint below.
  }

  const programs = await fetchPrograms();
  return programs.find((program) => program.program_id === id) ?? fallback;
};

export const updateProgram = async (program: Program): Promise<Program> => {
  const payload = await postProgramMutationEvent(toProgramMutationEvent("PUT", program));
  return payload ? parseProgramResponse(payload, program) : program;
};

export const createProgram = async (program: Program): Promise<Program> => {
  const programToCreate = {
    ...program,
    program_id: program.program_id || generateGuid(),
  };

  const payload = await postProgramMutationEvent(toProgramMutationEvent("POST", programToCreate));
  return payload ? parseProgramResponse(payload, programToCreate) : programToCreate;
};

export const createEmptyProgramHero = (): ProgramHero => ({
  image_url: "",
  image_text: "",
});

export const createEmptyProgramSection = (index: number): ProgramSection => ({
  section_image: "",
  section_title: "",
  section_text: "",
  section_order: String(index + 1),
});

export const createEmptyProgramPlayer = (): ProgramPlayer => ({
  player_image: "",
  player_says: "",
  player_description: "",
});

export const createEmptyProgramDetail = (): ProgramDetail => ({
  detail_title: "",
  detail_text: "",
  detail_file: "",
});

export const createEmptyProgramVariation = (): ProgramVariation => ({
  variations_description: "",
  variations_dates: "",
  variations_cost: "",
  variations_deadline: "",
});

export const createEmptyProgramAddon = (): ProgramAddon => ({
  addons_title: "",
  addons_description: "",
  addons_cost: "",
});

export const createEmptyProgramInformation = (): ProgramInformation => ({
  information_title: "",
  information_image: "",
  information_url: "",
});

export const createEmptyProgram = (id = generateGuid()): Program => ({
  program_id: id,
  program_hero: [createEmptyProgramHero()],
  program_title: "",
  program_description: "",
  program_section: [createEmptyProgramSection(0)],
  program_players: [],
  program_details: [],
  program_variations: [],
  program_addons: [],
  program_information: [],
  program_category: "",
  program_apply: "",
  program_enabled: true,
  program_status: "",
  program_date: "",
});

export type { ProgramArrayKey };
