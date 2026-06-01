import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import DatePicker from "../../../components/form/date-picker";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import TextArea from "../../../components/form/input/TextArea";
import S3ImageManager from "../../../components/page/S3ImageManager";
import Button from "../../../components/ui/button/Button";
import { resolveS3ImageUrl } from "../../../utils/s3Image";
import {
  createDestination as createDestinationRequest,
  createEmptyDestination,
  createEmptyDestinationAcademy,
  createEmptyDestinationCity,
  createEmptyDestinationHero,
  createEmptyDestinationSection,
  fetchDestination,
  normalizeEnabled,
  updateDestination as updateDestinationRequest,
} from "./destinationData";
import type {
  Destination,
  DestinationAcademy,
  DestinationCity,
  DestinationHero,
  DestinationSection,
} from "./destinationData";

const removeAt = <T,>(items: T[], index: number): T[] =>
  items.filter((_, itemIndex) => itemIndex !== index);

const richTextClasses =
  "min-h-[260px] w-full rounded-b-xl border border-t-0 border-gray-300 bg-white px-5 py-4 text-sm leading-7 text-gray-800 outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-5 [&_img]:max-h-[420px] [&_img]:w-full [&_img]:rounded-xl [&_img]:object-cover [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3";

const sanitizeRichHtml = (html: string): string => {
  const content = String(html ?? "");

  if (typeof document === "undefined") {
    return content;
  }

  const template = document.createElement("template");
  template.innerHTML = content;

  template.content
    .querySelectorAll("script, style, iframe, object, embed, link, meta")
    .forEach((element) => element.remove());

  template.content.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      const isUnsafeUrl =
        (name === "href" || name === "src") &&
        (value.startsWith("javascript:") || value.startsWith("data:text/html"));

      if (name.startsWith("on") || name === "style" || isUnsafeUrl) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return template.innerHTML;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const textToHtml = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function RichTextEditor({ value, onChange, disabled = false }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef("");

  useEffect(() => {
    const editor = editorRef.current;
    const sanitizedValue = sanitizeRichHtml(value);

    if (!editor) {
      return;
    }

    if (sanitizedValue !== lastHtmlRef.current && editor.innerHTML !== sanitizedValue) {
      editor.innerHTML = sanitizedValue;
      lastHtmlRef.current = sanitizedValue;
    }
  }, [value]);

  const syncEditorHtml = () => {
    const editor = editorRef.current;
    const nextHtml = sanitizeRichHtml(editor?.innerHTML ?? "");
    lastHtmlRef.current = nextHtml;
    onChange(nextHtml);
  };

  const runEditorCommand = (command: string, commandValue?: string) => {
    if (disabled) {
      return;
    }

    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    syncEditorHtml();
  };

  const insertImage = () => {
    const imageUrl = window.prompt("URL de imagen");
    const trimmedUrl = imageUrl?.trim();

    if (!trimmedUrl) {
      return;
    }

    runEditorCommand("insertImage", trimmedUrl);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();

    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const content = html ? sanitizeRichHtml(html) : textToHtml(text);

    document.execCommand("insertHTML", false, content);
    syncEditorHtml();
  };

  const buttonClasses =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-white/[0.03]";

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-t-xl border border-gray-300 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/60">
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          onClick={() => runEditorCommand("formatBlock", "H1")}
        >
          H1
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          onClick={() => runEditorCommand("formatBlock", "H2")}
        >
          H2
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          onClick={() => runEditorCommand("formatBlock", "P")}
        >
          P
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          onClick={() => runEditorCommand("bold")}
        >
          B
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          onClick={() => runEditorCommand("italic")}
        >
          I
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          onClick={() => runEditorCommand("insertUnorderedList")}
        >
          List
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          onClick={insertImage}
        >
          Img
        </button>
        <button
          type="button"
          className={buttonClasses}
          disabled={disabled}
          onClick={() => runEditorCommand("removeFormat")}
        >
          Clear
        </button>
      </div>
      <div
        ref={editorRef}
        className={richTextClasses}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onBlur={syncEditorHtml}
        onInput={syncEditorHtml}
        onPaste={handlePaste}
      />
    </div>
  );
}

export default function Destination() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [destination, setDestination] = useState<Destination | null>(null);
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

  const emptyDestination = useMemo(
    () =>
      createEmptyDestination(
        decodedId === "new" || decodedId === "" ? undefined : decodedId
      ),
    [decodedId]
  );

  useEffect(() => {
    if (decodedId === "" || decodedId === "new") {
      setDestination(createEmptyDestination());
      setLoadError(decodedId === "" ? "Id invalido en la URL." : null);
      setLoading(false);
      return;
    }

    let isCurrent = true;

    const loadDestination = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const found = await fetchDestination(decodedId);

        if (!isCurrent) {
          return;
        }

        setDestination(found);
      } catch {
        if (!isCurrent) {
          return;
        }

        setDestination(createEmptyDestination(decodedId));
        setLoadError("No se pudo cargar el destino del API.");
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    void loadDestination();

    return () => {
      isCurrent = false;
    };
  }, [decodedId]);

  const safeDestination = destination ?? emptyDestination;

  const updateDestination = (patch: Partial<Destination>) => {
    setDestination({ ...safeDestination, ...patch });
    setSaveMessage(null);
    setSaveError(null);
  };

  const onSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const isNewDestination = decodedId === "new";
      const destinationToSave = isNewDestination
        ? safeDestination
        : { ...safeDestination, destination_id: decodedId };
      const savedDestination = isNewDestination
        ? await createDestinationRequest(destinationToSave)
        : await updateDestinationRequest(destinationToSave);

      setDestination(savedDestination);
      setSaveMessage(
        isNewDestination
          ? "Destino creado correctamente."
          : "Destino actualizado correctamente."
      );

      if (isNewDestination) {
        navigate(`/destinations/${btoa(savedDestination.destination_id)}`, {
          replace: true,
        });
      }
    } catch (error) {
      const apiError = error instanceof Error ? ` ${error.message}` : "";
      setSaveError(
        decodedId === "new"
          ? `No se pudo crear el destino en el API.${apiError}`
          : `No se pudo actualizar el destino en el API.${apiError}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateHero = (index: number, patch: Partial<DestinationHero>) => {
    updateDestination({
      destination_hero: safeDestination.destination_hero.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateSection = (index: number, patch: Partial<DestinationSection>) => {
    updateDestination({
      destination_section: safeDestination.destination_section.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateCity = (index: number, patch: Partial<DestinationCity>) => {
    updateDestination({
      destination_cities: safeDestination.destination_cities.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateAcademy = (index: number, patch: Partial<DestinationAcademy>) => {
    updateDestination({
      destination_academies: safeDestination.destination_academies.map(
        (item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)
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
      <PageMeta title="Destination" description="Destination editor" />
      <PageBreadcrumb
        pageTitle={decodedId === "new" ? "New Destination" : "Destination Detail"}
      />
      <div className="space-y-6">
        <ComponentCard
          title={decodedId === "new" ? "New Destination" : "Destination"}
          desc="Mantenedor conectado al API de destinations."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {saveMessage && (
                <p className="text-sm text-success-600 dark:text-success-400">
                  {saveMessage}
                </p>
              )}
              {saveError && (
                <p className="text-sm text-error-600 dark:text-error-400">{saveError}</p>
              )}
              {loadError && (
                <p className="text-sm text-error-600 dark:text-error-400">{loadError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/destinations-list")}
              >
                Back to List
              </Button>
              <Button onClick={onSave} disabled={isSaving || loading}>
                {isSaving ? "Saving..." : "Save Destination"}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-6 text-sm text-gray-500 dark:text-gray-400">
              Cargando destino...
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="destination-id">Id</Label>
                  <Input
                    id="destination-id"
                    value={safeDestination.destination_id}
                    disabled
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={
                        normalizeEnabled(safeDestination.destination_state) === 1
                          ? "primary"
                          : "outline"
                      }
                      onClick={() => updateDestination({ destination_state: true })}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={
                        normalizeEnabled(safeDestination.destination_state) === 0
                          ? "primary"
                          : "outline"
                      }
                      onClick={() => updateDestination({ destination_state: false })}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="destination-title">Title</Label>
                  <Input
                    id="destination-title"
                    value={safeDestination.destination_title}
                    onChange={(event) =>
                      updateDestination({ destination_title: event.target.value })
                    }
                    placeholder="Nombre del destino"
                  />
                </div>
                <div>
                  <Label htmlFor="destination-category">Category</Label>
                  <Input
                    id="destination-category"
                    value={safeDestination.destination_category}
                    onChange={(event) =>
                      updateDestination({ destination_category: event.target.value })
                    }
                    placeholder="Categoria"
                  />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="destination-date">Date</Label>
                  <DatePicker
                    id="destination-date"
                    value={safeDestination.destination_date}
                    onDateChange={(destination_date) =>
                      updateDestination({ destination_date })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="destination-tags">Tags</Label>
                  <Input
                    id="destination-tags"
                    value={safeDestination.destination_tags}
                    onChange={(event) =>
                      updateDestination({ destination_tags: event.target.value })
                    }
                    placeholder="tag1, tag2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="destination-description">Description</Label>
                <TextArea
                  rows={4}
                  value={safeDestination.destination_description}
                  onChange={(value) =>
                    updateDestination({ destination_description: value })
                  }
                  placeholder="Descripcion principal del destino"
                />
              </div>

              <div>
                <Label htmlFor="destination-text">Text</Label>
                <TextArea
                  rows={6}
                  value={safeDestination.destination_text}
                  onChange={(value) => updateDestination({ destination_text: value })}
                  placeholder="Texto largo del destino"
                />
              </div>
            </div>
          )}
        </ComponentCard>

        <ComponentCard title="Destination Hero" desc="Carrusel principal del destino.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateDestination({
                  destination_hero: [
                    ...safeDestination.destination_hero,
                    createEmptyDestinationHero(),
                  ],
                })
              }
            >
              Add Hero
            </Button>
          </div>

          <div className="space-y-4">
            {safeDestination.destination_hero.map((item, index) => (
              <div
                key={`hero-${index}`}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Hero {index + 1}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateDestination({
                        destination_hero: removeAt(
                          safeDestination.destination_hero,
                          index
                        ),
                      })
                    }
                    disabled={safeDestination.destination_hero.length === 1}
                  >
                    Delete
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {renderImageField(`destination-hero-${index}`, item.image_url, (url) =>
                    updateHero(index, { image_url: url })
                  )}
                  <div>
                    <Label htmlFor={`destination-hero-text-${index}`}>Image Text</Label>
                    <Input
                      id={`destination-hero-text-${index}`}
                      value={item.image_text}
                      onChange={(event) =>
                        updateHero(index, { image_text: event.target.value })
                      }
                      placeholder="Train in Europe"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Destination Sections" desc="Bloques de contenido.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateDestination({
                  destination_section: [
                    ...safeDestination.destination_section,
                    createEmptyDestinationSection(
                      safeDestination.destination_section.length
                    ),
                  ],
                })
              }
            >
              Add Section
            </Button>
          </div>

          <div className="space-y-4">
            {safeDestination.destination_section.map((item, index) => (
              <div
                key={`section-${index}`}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Section {index + 1}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateDestination({
                        destination_section: removeAt(
                          safeDestination.destination_section,
                          index
                        ),
                      })
                    }
                    disabled={safeDestination.destination_section.length === 1}
                  >
                    Delete
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {renderImageField(`destination-section-${index}`, item.section_image, (url) =>
                    updateSection(index, { section_image: url })
                  )}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`destination-section-title-${index}`}>
                        Section Title
                      </Label>
                      <Input
                        id={`destination-section-title-${index}`}
                        value={item.section_title}
                        onChange={(event) =>
                          updateSection(index, { section_title: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`destination-section-order-${index}`}>
                        Section Order
                      </Label>
                      <Input
                        id={`destination-section-order-${index}`}
                        value={item.section_order}
                        onChange={(event) =>
                          updateSection(index, { section_order: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Section Text</Label>
                  <RichTextEditor
                    value={item.section_text}
                    onChange={(value) => updateSection(index, { section_text: value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Destination Cities" desc="Ciudades del destino.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateDestination({
                  destination_cities: [
                    ...safeDestination.destination_cities,
                    createEmptyDestinationCity(safeDestination.destination_cities.length),
                  ],
                })
              }
            >
              Add City
            </Button>
          </div>

          <div className="space-y-4">
            {safeDestination.destination_cities.map((item, index) => (
              <div
                key={`city-${index}`}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    City {index + 1}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateDestination({
                        destination_cities: removeAt(
                          safeDestination.destination_cities,
                          index
                        ),
                      })
                    }
                    disabled={safeDestination.destination_cities.length === 1}
                  >
                    Delete
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {renderImageField(`destination-city-${index}`, item.city_image, (url) =>
                    updateCity(index, { city_image: url })
                  )}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`destination-city-title-${index}`}>City Title</Label>
                      <Input
                        id={`destination-city-title-${index}`}
                        value={item.city_title}
                        onChange={(event) =>
                          updateCity(index, { city_title: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`destination-city-order-${index}`}>City Order</Label>
                      <Input
                        id={`destination-city-order-${index}`}
                        value={item.city_order}
                        onChange={(event) =>
                          updateCity(index, { city_order: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label>City Text</Label>
                  <TextArea
                    rows={4}
                    value={item.city_text}
                    onChange={(value) => updateCity(index, { city_text: value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Destination Academies" desc="Academias del destino.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateDestination({
                  destination_academies: [
                    ...safeDestination.destination_academies,
                    createEmptyDestinationAcademy(
                      safeDestination.destination_academies.length
                    ),
                  ],
                })
              }
            >
              Add Academy
            </Button>
          </div>

          <div className="space-y-4">
            {safeDestination.destination_academies.map((item, index) => (
              <div
                key={`academy-${index}`}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Academy {index + 1}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateDestination({
                        destination_academies: removeAt(
                          safeDestination.destination_academies,
                          index
                        ),
                      })
                    }
                    disabled={safeDestination.destination_academies.length === 1}
                  >
                    Delete
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {renderImageField(
                    `destination-academy-${index}`,
                    item.academy_image,
                    (url) => updateAcademy(index, { academy_image: url })
                  )}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`destination-academy-title-${index}`}>
                        Academy Title
                      </Label>
                      <Input
                        id={`destination-academy-title-${index}`}
                        value={item.academy_title}
                        onChange={(event) =>
                          updateAcademy(index, { academy_title: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`destination-academy-order-${index}`}>
                        Academy Order
                      </Label>
                      <Input
                        id={`destination-academy-order-${index}`}
                        value={item.academy_order}
                        onChange={(event) =>
                          updateAcademy(index, { academy_order: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`destination-academy-target-${index}`}>
                        Academy Target
                      </Label>
                      <Input
                        id={`destination-academy-target-${index}`}
                        value={item.academy_target}
                        onChange={(event) =>
                          updateAcademy(index, { academy_target: event.target.value })
                        }
                        placeholder="#"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label>Academy Text</Label>
                  <TextArea
                    rows={4}
                    value={item.academy_text}
                    onChange={(value) =>
                      updateAcademy(index, { academy_text: value })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
