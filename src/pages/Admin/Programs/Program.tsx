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
import { resolveS3ImageUrl } from "../../../utils/s3Image";
import ProgramDetail, { createProgramApplyUrl } from "./ProgramDetail";
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
  updateProgram as updateProgramRequest,
} from "./programData";
import type {
  Program,
  ProgramAddon,
  ProgramDetail as ProgramDetailItem,
  ProgramHero,
  ProgramInformation,
  ProgramPlayer,
  ProgramSection,
  ProgramVariation,
} from "./programData";

const removeAt = <T,>(items: T[], index: number): T[] =>
  items.filter((_, itemIndex) => itemIndex !== index);

export default function Program() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      const normalizedProgram = {
        ...safeProgram,
        program_apply:
          safeProgram.program_apply.trim() || createProgramApplyUrl(safeProgram.program_title),
      };
      const programToSave = isNewProgram
        ? normalizedProgram
        : { ...normalizedProgram, program_id: decodedId };
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

  const updateDetail = (index: number, patch: Partial<ProgramDetailItem>) => {
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

  return (
    <>
      <PageMeta title="Program" description="Program editor" />
      <PageBreadcrumb pageTitle={decodedId === "new" ? "New Program" : "Program Detail"} />
      <div className="space-y-6">
        <ComponentCard
          title={decodedId === "new" ? "New Program" : "Program"}
          desc="Carga de programa con estructuras dinamicas segun el API."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {saveMessage && (
                <p className="text-sm text-success-600 dark:text-success-400">
                  {saveMessage}
                </p>
              )}
              {saveError && (
                <p className="text-sm text-error-600 dark:text-error-400">
                  {saveError}
                </p>
              )}
              {loading && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Cargando programa...
                </p>
              )}
              {loadError && (
                <p className="text-sm text-error-600 dark:text-error-400">
                  {loadError}
                </p>
              )}
            </div>
            <div className="flex gap-2">
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

          <ProgramDetail program={safeProgram} onChange={updateProgram} />
        </ComponentCard>

        <ComponentCard title="Program Hero" desc="Carrusel principal del programa.">
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

            {safeProgram.program_hero.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aun no hay imagenes hero.
              </p>
            )}

            {safeProgram.program_hero.map((item, index) => (
              <div
                key={`hero-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60"
              >
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
        </ComponentCard>

        <ComponentCard title="Program Sections" desc="Bloques de contenido del programa.">
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

            {safeProgram.program_section.map((item, index) => (
              <div
                key={`section-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60"
              >
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
        </ComponentCard>

        <ComponentCard title="Program Players" desc="Testimonios o jugadores asociados.">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  updateProgram({
                    program_players: [
                      ...safeProgram.program_players,
                      createEmptyProgramPlayer(),
                    ],
                  })
                }
              >
                Add Player
              </Button>
            </div>

            {safeProgram.program_players.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aun no hay players.
              </p>
            )}

            {safeProgram.program_players.map((item, index) => (
              <div
                key={`player-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60"
              >
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
                        onChange={(value) =>
                          updatePlayer(index, { player_description: value })
                        }
                        placeholder="Descripcion"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Program Details" desc="Detalles adicionales y archivos.">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  updateProgram({
                    program_details: [
                      ...safeProgram.program_details,
                      createEmptyProgramDetail(),
                    ],
                  })
                }
              >
                Add Detail
              </Button>
            </div>

            {safeProgram.program_details.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aun no hay details.
              </p>
            )}

            {safeProgram.program_details.map((item, index) => (
              <div
                key={`detail-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60"
              >
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
        </ComponentCard>

        <ComponentCard title="Program Variations" desc="Fechas, costos y deadlines.">
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aun no hay variations.
              </p>
            )}

            {safeProgram.program_variations.map((item, index) => (
              <div
                key={`variation-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60"
              >
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
        </ComponentCard>

        <ComponentCard title="Program Addons" desc="Opcionales adicionales del programa.">
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

            {safeProgram.program_addons.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aun no hay addons.
              </p>
            )}

            {safeProgram.program_addons.map((item, index) => (
              <div
                key={`addon-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60"
              >
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
        </ComponentCard>

        <ComponentCard title="Program Information" desc="Links informativos relacionados.">
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aun no hay information.
              </p>
            )}

            {safeProgram.program_information.map((item, index) => (
              <div
                key={`information-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60"
              >
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
                  {renderImageField(
                    `program-information-${index}`,
                    item.information_image,
                    (url) => updateInformation(index, { information_image: url })
                  )}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`program-information-title-${index}`}>
                        Information Title
                      </Label>
                      <Input
                        id={`program-information-title-${index}`}
                        value={item.information_title}
                        onChange={(event) =>
                          updateInformation(index, {
                            information_title: event.target.value,
                          })
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
        </ComponentCard>
      </div>
    </>
  );
}
