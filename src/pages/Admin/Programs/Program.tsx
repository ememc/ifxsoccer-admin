import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import TextArea from "../../../components/form/input/TextArea";
import S3ImageManager from "../../../components/page/S3ImageManager";
import Button from "../../../components/ui/button/Button";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
import { resolveS3ImageUrl } from "../../../utils/s3Image";
import {
  createEmptyProgram,
  createEmptyProgramAddon,
  createEmptyProgramDetail,
  createEmptyProgramHero,
  createEmptyProgramInformation,
  createEmptyProgramPlayer,
  createEmptyProgramSection,
  createEmptyProgramVariation,
  createProgram as createProgramRequest,
  fetchProgram,
  normalizeEnabled,
  updateProgram as updateProgramRequest,
} from "./programData";
import type {
  Program,
  ProgramAddon,
  ProgramDetail,
  ProgramHero,
  ProgramInformation,
  ProgramPlayer,
  ProgramSection,
  ProgramVariation,
} from "./programData";

const removeAt = <T,>(items: T[], index: number): T[] =>
  items.filter((_, itemIndex) => itemIndex !== index);

const tabOptions = [
  { id: "main", label: "Main" },
  { id: "hero", label: "Heros" },
  { id: "sections", label: "Sections" },
  { id: "players", label: "Players" },
  { id: "details", label: "Details" },
  { id: "variations", label: "Variations" },
  { id: "addons", label: "Addons" },
  { id: "information", label: "Info" },
] as const;

type ProgramTab = (typeof tabOptions)[number]["id"];

const tabButtonClass =
  "rounded-xl px-4 py-2 text-sm font-semibold transition whitespace-nowrap";

const panelCardClass =
  "rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60";

const formatPreviewDate = (dateValue: string) => {
  if (!dateValue) {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

function EmptyTabState({ text }: { text: string }) {
  return <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>;
}

export default function Program() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isOpen, openModal, closeModal } = useModal();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProgramTab>("main");

  const decodedId = useMemo(() => {
    if (!id || id === "new") {
      return "new";
    }

    try {
      return atob(id);
    } catch {
      return "";
    }
  }, [id]);

  const emptyProgram = useMemo(
    () => createEmptyProgram(decodedId === "new" || decodedId === "" ? undefined : decodedId),
    [decodedId]
  );

  useEffect(() => {
    if (decodedId === "" || decodedId === "new") {
      setProgram(createEmptyProgram());
      setLoadError(decodedId === "" ? "Id invalido en la URL." : null);
      setLoading(false);
      return;
    }

    let isCurrent = true;

    const loadProgram = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const found = await fetchProgram(decodedId);

        if (!isCurrent) {
          return;
        }

        setProgram(found);
      } catch {
        if (!isCurrent) {
          return;
        }

        setProgram(createEmptyProgram(decodedId));
        setLoadError("No se pudo cargar el programa del API.");
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    void loadProgram();

    return () => {
      isCurrent = false;
    };
  }, [decodedId]);

  const safeProgram = program ?? emptyProgram;
  const previewHero = resolveS3ImageUrl(safeProgram.program_hero[0]?.image_url ?? "");
  const enabledCountSummary = `${safeProgram.program_section.length} sections, ${safeProgram.program_addons.length} addons`;
  const previewDate = useMemo(() => formatPreviewDate(safeProgram.program_date), [safeProgram.program_date]);

  const updateProgram = (patch: Partial<Program>) => {
    setProgram({ ...safeProgram, ...patch });
    setSaveMessage(null);
    setSaveError(null);
  };

  const onSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const isNewProgram = decodedId === "new";
      const programToSave = isNewProgram
        ? safeProgram
        : { ...safeProgram, program_id: decodedId };
      const savedProgram = isNewProgram
        ? await createProgramRequest(programToSave)
        : await updateProgramRequest(programToSave);

      setProgram(savedProgram);
      setSaveMessage(
        isNewProgram
          ? "Programa creado correctamente."
          : "Programa actualizado correctamente."
      );

      if (isNewProgram) {
        navigate(`/programs/${btoa(savedProgram.program_id)}`, { replace: true });
      }
    } catch (error) {
      const apiError = error instanceof Error ? ` ${error.message}` : "";
      setSaveError(
        decodedId === "new"
          ? `No se pudo crear el programa en el API.${apiError}`
          : `No se pudo actualizar el programa en el API.${apiError}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateHero = (index: number, patch: Partial<ProgramHero>) => {
    updateProgram({
      program_hero: safeProgram.program_hero.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateSection = (index: number, patch: Partial<ProgramSection>) => {
    updateProgram({
      program_section: safeProgram.program_section.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updatePlayer = (index: number, patch: Partial<ProgramPlayer>) => {
    updateProgram({
      program_players: safeProgram.program_players.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateDetail = (index: number, patch: Partial<ProgramDetail>) => {
    updateProgram({
      program_details: safeProgram.program_details.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateVariation = (index: number, patch: Partial<ProgramVariation>) => {
    updateProgram({
      program_variations: safeProgram.program_variations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateAddon = (index: number, patch: Partial<ProgramAddon>) => {
    updateProgram({
      program_addons: safeProgram.program_addons.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateInformation = (index: number, patch: Partial<ProgramInformation>) => {
    updateProgram({
      program_information: safeProgram.program_information.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const renderImageField = (
    idPrefix: string,
    value: string,
    onChange: (url: string) => void
  ) => {
    const previewUrl = resolveS3ImageUrl(value);

    return (
      <div className="space-y-3">
        <div>
          <Label htmlFor={`${idPrefix}-image`}>Image URL</Label>
          <Input
            id={`${idPrefix}-image`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://.../image.jpg"
          />
        </div>
        {previewUrl && (
          <div className="h-36 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-white/[0.08] dark:bg-gray-900">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = "/images/logo/ifx-logo.png";
              }}
            />
          </div>
        )}
        <S3ImageManager selectedUrl={value} onSelect={onChange} />
      </div>
    );
  };

  const renderActiveTab = () => {
    if (activeTab === "main") {
      return (
        <div className="rounded-2xl border-2 border-[#3558a8] bg-[#f5f8ff] p-4 dark:border-[#4f6cb2] dark:bg-[#101a33]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#234487] dark:text-[#9fb5e8]">
              Main Program Content
            </h3>
            <span className="rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
              Principal
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="program-id">Id</Label>
              <Input id="program-id" value={safeProgram.program_id} disabled />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <Label htmlFor="program-title">Titulo</Label>
                <Input
                  id="program-title"
                  value={safeProgram.program_title}
                  onChange={(event) => updateProgram({ program_title: event.target.value })}
                  placeholder="Nombre del programa"
                />
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Button
                    variant={normalizeEnabled(safeProgram.program_enabled) === 1 ? "primary" : "outline"}
                    onClick={() => updateProgram({ program_enabled: true })}
                  >
                    Enabled
                  </Button>
                  <Button
                    variant={normalizeEnabled(safeProgram.program_enabled) === 0 ? "primary" : "outline"}
                    onClick={() => updateProgram({ program_enabled: false })}
                  >
                    Disabled
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="program-description">Descripcion</Label>
              <TextArea
                rows={5}
                value={safeProgram.program_description}
                onChange={(value) => updateProgram({ program_description: value })}
                placeholder="Descripcion principal del programa"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <Label htmlFor="program-category">Categoria</Label>
                <Input
                  id="program-category"
                  value={safeProgram.program_category}
                  onChange={(event) => updateProgram({ program_category: event.target.value })}
                  placeholder="Categoria"
                />
              </div>
              <div>
                <Label htmlFor="program-status">Program Status</Label>
                <Input
                  id="program-status"
                  value={safeProgram.program_status}
                  onChange={(event) => updateProgram({ program_status: event.target.value })}
                  placeholder="Status"
                />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <Label htmlFor="program-apply">Apply URL</Label>
                <Input
                  id="program-apply"
                  value={safeProgram.program_apply}
                  onChange={(event) => updateProgram({ program_apply: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="program-date">Fecha de Publicacion</Label>
                <Input
                  id="program-date"
                  type="date"
                  value={safeProgram.program_date}
                  onChange={(event) => updateProgram({ program_date: event.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "hero") {
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateProgram({
                  program_hero: [...safeProgram.program_hero, createEmptyProgramHero()],
                })
              }
            >
              Add Hero
            </Button>
          </div>

          {safeProgram.program_hero.length === 0 && <EmptyTabState text="Aun no hay imagenes hero." />}

          {safeProgram.program_hero.map((item, index) => (
            <div key={`hero-${index}`} className={panelCardClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Hero {index + 1}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateProgram({ program_hero: removeAt(safeProgram.program_hero, index) })
                  }
                >
                  Delete
                </Button>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {renderImageField(`program-hero-${index}`, item.image_url, (url) =>
                  updateHero(index, { image_url: url })
                )}
                <div>
                  <Label htmlFor={`program-hero-text-${index}`}>Image Text</Label>
                  <TextArea
                    rows={4}
                    value={item.image_text}
                    onChange={(value) => updateHero(index, { image_text: value })}
                    placeholder="Texto sobre la imagen"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "sections") {
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateProgram({
                  program_section: [
                    ...safeProgram.program_section,
                    createEmptyProgramSection(safeProgram.program_section.length),
                  ],
                })
              }
            >
              Add Section
            </Button>
          </div>

          {safeProgram.program_section.length === 0 && <EmptyTabState text="Aun no hay sections." />}

          {safeProgram.program_section.map((item, index) => (
            <div key={`section-${index}`} className={panelCardClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Section {index + 1}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateProgram({
                      program_section: removeAt(safeProgram.program_section, index),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {renderImageField(`program-section-${index}`, item.section_image, (url) =>
                  updateSection(index, { section_image: url })
                )}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`program-section-title-${index}`}>Section Title</Label>
                    <Input
                      id={`program-section-title-${index}`}
                      value={item.section_title}
                      onChange={(event) =>
                        updateSection(index, { section_title: event.target.value })
                      }
                      placeholder="Titulo de la seccion"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`program-section-order-${index}`}>Section Order</Label>
                    <Input
                      id={`program-section-order-${index}`}
                      value={item.section_order}
                      onChange={(event) =>
                        updateSection(index, { section_order: event.target.value })
                      }
                      placeholder="Orden"
                    />
                  </div>
                  <div>
                    <Label>Section Text</Label>
                    <TextArea
                      rows={5}
                      value={item.section_text}
                      onChange={(value) => updateSection(index, { section_text: value })}
                      placeholder="Contenido de la seccion"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "players") {
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateProgram({
                  program_players: [...safeProgram.program_players, createEmptyProgramPlayer()],
                })
              }
            >
              Add Player
            </Button>
          </div>

          {safeProgram.program_players.length === 0 && <EmptyTabState text="Aun no hay players." />}

          {safeProgram.program_players.map((item, index) => (
            <div key={`player-${index}`} className={panelCardClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Player {index + 1}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateProgram({
                      program_players: removeAt(safeProgram.program_players, index),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {renderImageField(`program-player-${index}`, item.player_image, (url) =>
                  updatePlayer(index, { player_image: url })
                )}
                <div className="space-y-4">
                  <div>
                    <Label>Player Says</Label>
                    <TextArea
                      rows={4}
                      value={item.player_says}
                      onChange={(value) => updatePlayer(index, { player_says: value })}
                      placeholder="Testimonio"
                    />
                  </div>
                  <div>
                    <Label>Player Description</Label>
                    <TextArea
                      rows={5}
                      value={item.player_description}
                      onChange={(value) => updatePlayer(index, { player_description: value })}
                      placeholder="Descripcion"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "details") {
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateProgram({
                  program_details: [...safeProgram.program_details, createEmptyProgramDetail()],
                })
              }
            >
              Add Detail
            </Button>
          </div>

          {safeProgram.program_details.length === 0 && <EmptyTabState text="Aun no hay details." />}

          {safeProgram.program_details.map((item, index) => (
            <div key={`detail-${index}`} className={panelCardClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Detail {index + 1}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateProgram({
                      program_details: removeAt(safeProgram.program_details, index),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <Label htmlFor={`program-detail-title-${index}`}>Detail Title</Label>
                  <Input
                    id={`program-detail-title-${index}`}
                    value={item.detail_title}
                    onChange={(event) =>
                      updateDetail(index, { detail_title: event.target.value })
                    }
                    placeholder="Titulo"
                  />
                </div>
                <div>
                  <Label htmlFor={`program-detail-file-${index}`}>Detail File</Label>
                  <Input
                    id={`program-detail-file-${index}`}
                    value={item.detail_file}
                    onChange={(event) =>
                      updateDetail(index, { detail_file: event.target.value })
                    }
                    placeholder="https://.../file.pdf"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label>Detail Text</Label>
                <TextArea
                  rows={5}
                  value={item.detail_text}
                  onChange={(value) => updateDetail(index, { detail_text: value })}
                  placeholder="Texto del detalle"
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "variations") {
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateProgram({
                  program_variations: [
                    ...safeProgram.program_variations,
                    createEmptyProgramVariation(),
                  ],
                })
              }
            >
              Add Variation
            </Button>
          </div>

          {safeProgram.program_variations.length === 0 && (
            <EmptyTabState text="Aun no hay variations." />
          )}

          {safeProgram.program_variations.map((item, index) => (
            <div key={`variation-${index}`} className={panelCardClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Variation {index + 1}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateProgram({
                      program_variations: removeAt(safeProgram.program_variations, index),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
              <div>
                <Label>Variations Description</Label>
                <TextArea
                  rows={4}
                  value={item.variations_description}
                  onChange={(value) =>
                    updateVariation(index, { variations_description: value })
                  }
                  placeholder="Descripcion"
                />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div>
                  <Label htmlFor={`program-variation-dates-${index}`}>Dates</Label>
                  <Input
                    id={`program-variation-dates-${index}`}
                    value={item.variations_dates}
                    onChange={(event) =>
                      updateVariation(index, { variations_dates: event.target.value })
                    }
                    placeholder="Fechas"
                  />
                </div>
                <div>
                  <Label htmlFor={`program-variation-cost-${index}`}>Cost</Label>
                  <Input
                    id={`program-variation-cost-${index}`}
                    value={item.variations_cost}
                    onChange={(event) =>
                      updateVariation(index, { variations_cost: event.target.value })
                    }
                    placeholder="Costo"
                  />
                </div>
                <div>
                  <Label htmlFor={`program-variation-deadline-${index}`}>Deadline</Label>
                  <Input
                    id={`program-variation-deadline-${index}`}
                    value={item.variations_deadline}
                    onChange={(event) =>
                      updateVariation(index, { variations_deadline: event.target.value })
                    }
                    placeholder="Deadline"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "addons") {
      return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() =>
                updateProgram({
                  program_addons: [...safeProgram.program_addons, createEmptyProgramAddon()],
                })
              }
            >
              Add Addon
            </Button>
          </div>

          {safeProgram.program_addons.length === 0 && <EmptyTabState text="Aun no hay addons." />}

          {safeProgram.program_addons.map((item, index) => (
            <div key={`addon-${index}`} className={panelCardClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Addon {index + 1}
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateProgram({
                      program_addons: removeAt(safeProgram.program_addons, index),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <Label htmlFor={`program-addon-title-${index}`}>Addon Title</Label>
                  <Input
                    id={`program-addon-title-${index}`}
                    value={item.addons_title}
                    onChange={(event) =>
                      updateAddon(index, { addons_title: event.target.value })
                    }
                    placeholder="Titulo"
                  />
                </div>
                <div>
                  <Label htmlFor={`program-addon-cost-${index}`}>Addon Cost</Label>
                  <Input
                    id={`program-addon-cost-${index}`}
                    value={item.addons_cost}
                    onChange={(event) =>
                      updateAddon(index, { addons_cost: event.target.value })
                    }
                    placeholder="Costo"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label>Addon Description</Label>
                <TextArea
                  rows={4}
                  value={item.addons_description}
                  onChange={(value) => updateAddon(index, { addons_description: value })}
                  placeholder="Descripcion"
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            onClick={() =>
              updateProgram({
                program_information: [
                  ...safeProgram.program_information,
                  createEmptyProgramInformation(),
                ],
              })
            }
          >
            Add Information
          </Button>
        </div>

        {safeProgram.program_information.length === 0 && (
          <EmptyTabState text="Aun no hay information." />
        )}

        {safeProgram.program_information.map((item, index) => (
          <div key={`information-${index}`} className={panelCardClass}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Information {index + 1}
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateProgram({
                    program_information: removeAt(safeProgram.program_information, index),
                  })
                }
              >
                Delete
              </Button>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {renderImageField(`program-information-${index}`, item.information_image, (url) =>
                updateInformation(index, { information_image: url })
              )}
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`program-information-title-${index}`}>Information Title</Label>
                  <Input
                    id={`program-information-title-${index}`}
                    value={item.information_title}
                    onChange={(event) =>
                      updateInformation(index, { information_title: event.target.value })
                    }
                    placeholder="Titulo"
                  />
                </div>
                <div>
                  <Label htmlFor={`program-information-url-${index}`}>Information URL</Label>
                  <Input
                    id={`program-information-url-${index}`}
                    value={item.information_url}
                    onChange={(event) =>
                      updateInformation(index, { information_url: event.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Program" description="Program editor" />
      <PageBreadcrumb pageTitle={decodedId === "new" ? "New Program" : "Program Detail"} />

      <div className="space-y-6">
        <div className="sticky top-4 z-20 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {decodedId === "new" ? "New Program" : "Program Detail"}
              </h1>
              <div>
                {saveMessage && (
                  <p className="text-sm text-success-600 dark:text-success-400">{saveMessage}</p>
                )}
                {saveError && (
                  <p className="text-sm text-error-600 dark:text-error-400">{saveError}</p>
                )}
                {loading && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cargando programa...
                  </p>
                )}
                {loadError && (
                  <p className="text-sm text-error-600 dark:text-error-400">{loadError}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={openModal}>
                Preview Program
              </Button>
              <Button variant="outline" onClick={() => navigate("/programs-list")}>
                Back to List
              </Button>
              <Button
                onClick={() => {
                  void onSave();
                }}
                disabled={loading || isSaving}
              >
                {isSaving ? "Saving..." : "Save Program"}
              </Button>
            </div>
          </div>
        </div>

        <ComponentCard
          title="Program Editor"
          desc="Ahora la informacion esta dividida por pestañas para editarla mas facil."
        >
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {tabOptions.map((tab) => {
                const isActive = tab.id === activeTab;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`${tabButtonClass} ${
                      isActive
                        ? "bg-brand-500 text-white shadow-theme-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {renderActiveTab()}
        </ComponentCard>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="mx-4 max-w-7xl p-0">
        <div className="max-h-[88vh] overflow-y-auto bg-[#e3e3e3] p-3 sm:p-5">
          <div className="mx-auto w-full max-w-[1100px] overflow-hidden rounded-[22px] bg-white text-[#1e1e1e]">
            <article className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
              <p className="text-[14px] text-[#4a4a4a]">Posted On {previewDate}</p>

              <div className="space-y-2">
                <h1 className="text-[34px] font-semibold leading-tight text-[#1d3570]">
                  {safeProgram.program_title || "Program title"}
                </h1>
                <p className="text-[18px] leading-7 text-[#4a4a4a]">
                  {safeProgram.program_description || "La descripcion principal del programa aparecera aqui."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-white">
                {safeProgram.program_category && (
                  <span className="inline-flex min-w-[125px] items-center justify-center bg-[#3f4c96] px-4 py-2">
                    {safeProgram.program_category}
                  </span>
                )}
                <span
                  className={`inline-flex min-w-[125px] items-center justify-center px-4 py-2 ${
                    normalizeEnabled(safeProgram.program_enabled) === 1
                      ? "bg-[#c27a2c]"
                      : "bg-[#6b7280]"
                  }`}
                >
                  {normalizeEnabled(safeProgram.program_enabled) === 1 ? "Enabled" : "Disabled"}
                </span>
                {safeProgram.program_status && (
                  <span className="inline-flex min-w-[125px] items-center justify-center bg-[#2d9cdc] px-4 py-2">
                    {safeProgram.program_status}
                  </span>
                )}
                <span className="inline-flex min-w-[125px] items-center justify-center bg-[#88854a] px-4 py-2">
                  {enabledCountSummary}
                </span>
              </div>

              <div className="overflow-hidden bg-[#d7d7d7]">
                {previewHero ? (
                  <img
                    src={previewHero}
                    alt={safeProgram.program_title || "Program preview"}
                    className="h-[260px] w-full object-cover sm:h-[560px]"
                    onError={(event) => {
                      event.currentTarget.src = "/images/logo/ifx-logo.png";
                    }}
                  />
                ) : (
                  <div className="flex h-[260px] items-center justify-center text-sm text-gray-500 sm:h-[560px]">
                    Imagen principal del programa
                  </div>
                )}
              </div>

              {safeProgram.program_section.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-[26px] font-semibold leading-tight text-[#1d3570]">
                    Sections
                  </h2>
                  <div className="space-y-4">
                    {safeProgram.program_section.map((section, index) => (
                      <div key={`${section.section_title}-${index}`} className="space-y-3 border-t border-[#d7d7d7] pt-4 first:border-t-0 first:pt-0">
                        <div className="space-y-2">
                          <h3 className="text-[22px] font-semibold text-[#1d3570]">
                            {section.section_title || `Section ${index + 1}`}
                          </h3>
                          <p className="text-[18px] leading-8 text-[#2d3749]">
                            {section.section_text || "Sin contenido todavia."}
                          </p>
                        </div>
                        {resolveS3ImageUrl(section.section_image) && (
                          <div className="overflow-hidden rounded-lg bg-[#d7d7d7]">
                            <img
                              src={resolveS3ImageUrl(section.section_image) ?? ""}
                              alt={section.section_title || `Section ${index + 1}`}
                              className="max-h-[420px] w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.src = "/images/logo/ifx-logo.png";
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {safeProgram.program_addons.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-[26px] font-semibold leading-tight text-[#1d3570]">
                    Addons
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {safeProgram.program_addons.map((addon, index) => (
                      <div key={`${addon.addons_title}-${index}`} className="rounded-lg border border-[#d7d7d7] bg-[#f8f8f8] p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-[20px] font-semibold text-[#1d3570]">
                              {addon.addons_title || `Addon ${index + 1}`}
                            </h3>
                            <p className="mt-2 text-[16px] leading-7 text-[#4a4a4a]">
                              {addon.addons_description || "Sin descripcion."}
                            </p>
                          </div>
                          <span className="text-[18px] font-semibold text-[#c27a2c]">
                            {addon.addons_cost || "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </article>
          </div>
        </div>
      </Modal>
    </>
  );
}
