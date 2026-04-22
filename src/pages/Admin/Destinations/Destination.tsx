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
import {
  createEmptyDestinationHeroSlide,
  createEmptyDestination,
  createEmptyDestinationSection,
  loadDestinations,
  upsertDestination,
} from "./destinationData";
import type { Destination, DestinationHeroSlide, DestinationSection } from "./destinationData";

const getPreviewClasses = (index: number) =>
  index % 2 === 0
    ? "lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]"
    : "lg:grid-cols-[minmax(0,1fr)_minmax(0,220px)]";
const DEFAULT_HERO_CAPTION = "YOU COULD BE NEXT!";

export default function Destination() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isOpen, openModal, closeModal } = useModal();

  const [Destination, setProgram] = useState<Destination | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [heroImageDraft, setHeroImageDraft] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);

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

  useEffect(() => {
    if (decodedId === "") {
      setProgram(createEmptyDestination());
      return;
    }

    if (decodedId === "new") {
      setProgram(createEmptyDestination());
      return;
    }

    const found = loadDestinations().find((item) => item.id === decodedId);
    setProgram(found ?? createEmptyDestination());
  }, [decodedId]);

  const safeProgram = Destination ?? createEmptyDestination();
  const validHeroSlides = useMemo(
    () => safeProgram.heroImages.filter((slide) => slide.image.trim().length > 0),
    [safeProgram.heroImages]
  );
  const primaryHeroSlide =
    validHeroSlides.find((slide) => slide.id === safeProgram.primaryHeroImageId) ??
    validHeroSlides[0];
  const primaryHeroIndex = primaryHeroSlide
    ? Math.max(
        0,
        validHeroSlides.findIndex((slide) => slide.id === primaryHeroSlide.id)
      )
    : 0;
  const activeHeroSlide = validHeroSlides[carouselIndex] ?? primaryHeroSlide;

  const normalizeDestinationImages = (nextProgram: Destination): Destination => {
    const normalizedSlides = nextProgram.heroImages.reduce<DestinationHeroSlide[]>(
      (acc, slide, index) => {
        const id = String(slide.id || `hero-${Date.now()}-${index}`);
        if (acc.some((item) => item.id === id)) {
          return acc;
        }

        acc.push({
          id,
          image: String(slide.image ?? "").trim(),
          caption: String(slide.caption ?? DEFAULT_HERO_CAPTION).trim() || DEFAULT_HERO_CAPTION,
          applyNowUrl: String(slide.applyNowUrl ?? "").trim(),
        });
        return acc;
      },
      []
    );
    const slidesWithImage = normalizedSlides.filter((slide) => slide.image.length > 0);
    const primarySlide =
      slidesWithImage.find((slide) => slide.id === nextProgram.primaryHeroImageId) ??
      slidesWithImage[0];

    return {
      ...nextProgram,
      heroImages: normalizedSlides,
      primaryHeroImageId: primarySlide?.id ?? normalizedSlides[0]?.id ?? "",
      mainImage: primarySlide?.image ?? "",
    };
  };

  const updateProgram = (patch: Partial<Destination>) => {
    setProgram(normalizeDestinationImages({ ...safeProgram, ...patch }));
    setSaveMessage(null);
  };

  const addHeroImage = (imageUrl: string, setAsPrimary = false) => {
    const trimmed = imageUrl.trim();
    if (!trimmed) {
      return;
    }

    const alreadyExists = safeProgram.heroImages.some((slide) => slide.image === trimmed);
    if (alreadyExists) {
      return;
    }

    const newSlide: DestinationHeroSlide = {
      ...createEmptyDestinationHeroSlide(safeProgram.heroImages.length),
      image: trimmed,
      caption: DEFAULT_HERO_CAPTION,
      applyNowUrl: safeProgram.applyOnlineUrl,
    };

    updateProgram({
      heroImages: [...safeProgram.heroImages, newSlide],
      primaryHeroImageId:
        setAsPrimary || !primaryHeroSlide ? newSlide.id : safeProgram.primaryHeroImageId,
    });
    setHeroImageDraft("");
  };

  const updateHeroSlide = (slideId: string, patch: Partial<DestinationHeroSlide>) => {
    updateProgram({
      heroImages: safeProgram.heroImages.map((slide) =>
        slide.id === slideId ? { ...slide, ...patch } : slide
      ),
    });
  };

  const removeHeroImage = (slideId: string) => {
    const nextSlides = safeProgram.heroImages.filter((slide) => slide.id !== slideId);
    const nextPrimary =
      safeProgram.primaryHeroImageId === slideId
        ? nextSlides.find((slide) => slide.image.trim())?.id ?? nextSlides[0]?.id ?? ""
        : safeProgram.primaryHeroImageId;

    updateProgram({
      heroImages: nextSlides,
      primaryHeroImageId: nextPrimary,
    });
  };

  const setPrimaryHeroImage = (slideId: string) => {
    updateProgram({ primaryHeroImageId: slideId });
  };

  const updateSection = (
    sectionId: string,
    patch: Partial<DestinationSection>
  ) => {
    updateProgram({
      sections: safeProgram.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    });
  };

  const addSection = () => {
    updateProgram({
      sections: [
        ...safeProgram.sections,
        createEmptyDestinationSection(safeProgram.sections.length),
      ],
    });
  };

  const removeSection = (sectionId: string) => {
    updateProgram({
      sections: safeProgram.sections.filter((section) => section.id !== sectionId),
    });
  };

  const onSave = () => {
    upsertDestination(normalizeDestinationImages(safeProgram));
    setSaveMessage("Programa guardado localmente.");

    if (decodedId === "new") {
      navigate(`/destinations/${btoa(safeProgram.id)}`, { replace: true });
    }
  };

  useEffect(() => {
    setCarouselIndex((current) => {
      if (validHeroSlides.length === 0) {
        return 0;
      }

      return Math.min(current, validHeroSlides.length - 1);
    });
  }, [validHeroSlides.length]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCarouselIndex(primaryHeroIndex);
  }, [isOpen, primaryHeroIndex]);

  useEffect(() => {
    if (!isOpen || validHeroSlides.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCarouselIndex((current) => (current + 1) % validHeroSlides.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [validHeroSlides.length, isOpen]);

  return (
    <>
      <PageMeta title="Destination" description="Destination editor" />
      <PageBreadcrumb
        pageTitle={decodedId === "new" ? "New Destination" : "Destination Detail"}
      />
      <div className="space-y-6">
        <ComponentCard
          title={decodedId === "new" ? "New Destination" : "Destination"}
          desc="Front provisional con persistencia local mientras el API queda listo."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {saveMessage && (
                <p className="text-sm text-success-600 dark:text-success-400">
                  {saveMessage}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={openModal}>
                Preview Destination
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/destinations-list")}
              >
                Back to List
              </Button>
              <Button onClick={onSave}>Save Destination</Button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#3558a8] bg-[#f5f8ff] p-4 dark:border-[#4f6cb2] dark:bg-[#101a33]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#234487] dark:text-[#9fb5e8]">
                Main Destination Content
              </h3>
              <span className="rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
                Principal
              </span>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="Destination-title">Titulo</Label>
                  <Input
                    id="Destination-title"
                    value={safeProgram.title}
                    onChange={(e) => updateProgram({ title: e.target.value })}
                    placeholder="Nombre del programa"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={safeProgram.enabled === 1 ? "primary" : "outline"}
                      onClick={() => updateProgram({ enabled: 1 })}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={safeProgram.enabled === 0 ? "primary" : "outline"}
                      onClick={() => updateProgram({ enabled: 0 })}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60">
                <div className="flex items-center justify-between gap-3">
                  <Label>Imagenes Hero (Carrusel)</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Selecciona una imagen principal para portada.
                  </p>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[260px] flex-1">
                    <Label htmlFor="hero-image-draft">Agregar URL</Label>
                    <Input
                      id="hero-image-draft"
                      value={heroImageDraft}
                      onChange={(e) => setHeroImageDraft(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <Button
                    onClick={() => addHeroImage(heroImageDraft, validHeroSlides.length === 0)}
                  >
                    Add Image
                  </Button>
                </div>

                <div>
                  <Label>Biblioteca S3 Hero</Label>
                  <S3ImageManager
                    selectedUrl={primaryHeroSlide?.image ?? ""}
                    onSelect={(url) => addHeroImage(url, validHeroSlides.length === 0)}
                  />
                </div>

                <div className="space-y-3">
                  {safeProgram.heroImages.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Aun no hay imagenes en el carrusel.
                    </p>
                  ) : (
                    safeProgram.heroImages.map((slide, index) => (
                      <div
                        key={slide.id}
                        className="rounded-xl border border-gray-200 p-3 dark:border-gray-800"
                      >
                        <div className="grid gap-3 lg:grid-cols-[110px_minmax(0,1fr)]">
                          <div className="h-20 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                            {slide.image ? (
                              <img
                                src={slide.image}
                                alt={`Hero ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-gray-500">
                                Sin imagen
                              </div>
                            )}
                          </div>
                          <div className="grid gap-3">
                            <Input
                              value={slide.image}
                              onChange={(e) =>
                                updateHeroSlide(slide.id, { image: e.target.value })
                              }
                              placeholder="Image URL https://..."
                            />
                            <Input
                              value={slide.caption}
                              onChange={(e) =>
                                updateHeroSlide(slide.id, { caption: e.target.value })
                              }
                              placeholder="Texto overlay (ej: YOU COULD BE NEXT!)"
                            />
                            <Input
                              value={slide.applyNowUrl}
                              onChange={(e) =>
                                updateHeroSlide(slide.id, { applyNowUrl: e.target.value })
                              }
                              placeholder="Apply Now URL https://..."
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant={
                                  safeProgram.primaryHeroImageId === slide.id
                                    ? "primary"
                                    : "outline"
                                }
                                size="sm"
                                onClick={() => setPrimaryHeroImage(slide.id)}
                              >
                                {safeProgram.primaryHeroImageId === slide.id
                                  ? "Principal"
                                  : "Set Principal"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeHeroImage(slide.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <Label>Texto Principal</Label>
                <TextArea
                  rows={5}
                  value={safeProgram.mainText}
                  onChange={(value) => updateProgram({ mainText: value })}
                  placeholder="Descripcion principal del programa"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="learn-more-url">Learn More URL</Label>
                  <Input
                    id="learn-more-url"
                    value={safeProgram.learnMoreUrl}
                    onChange={(e) => updateProgram({ learnMoreUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="apply-online-url">Apply Online URL</Label>
                  <Input
                    id="apply-online-url"
                    value={safeProgram.applyOnlineUrl}
                    onChange={(e) => updateProgram({ applyOnlineUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Sections Builder"
          desc="Cada seccion alterna automaticamente la disposicion entre imagen-izquierda y imagen-derecha."
        >
          <div className="rounded-2xl border-2 border-[#3558a8] bg-[#f5f8ff] p-4 dark:border-[#4f6cb2] dark:bg-[#101a33]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#234487] dark:text-[#9fb5e8]">
                Sections Area
              </h3>
              <span className="rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
                Sections
              </span>
            </div>
            <div className="mb-4 flex justify-end">
              <Button onClick={addSection}>Add Section</Button>
            </div>

            {safeProgram.sections.map((section, index) => {
              const imageFirst = index % 2 === 0;

              return (
                <div
                  key={section.id}
                  className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        Section {index + 1}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {imageFirst
                          ? "Layout: imagen izquierda, titulo y texto a la derecha."
                          : "Layout: titulo y texto a la izquierda, imagen a la derecha."}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeSection(section.id)}
                      disabled={safeProgram.sections.length === 1}
                    >
                      Delete Section
                    </Button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <Label htmlFor={`section-title-${section.id}`}>Titulo</Label>
                      <Input
                        id={`section-title-${section.id}`}
                        value={section.title}
                        onChange={(e) =>
                          updateSection(section.id, { title: e.target.value })
                        }
                        placeholder="Titulo de la seccion"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`section-image-${section.id}`}>Imagen</Label>
                      <Input
                        id={`section-image-${section.id}`}
                        value={section.image}
                        onChange={(e) =>
                          updateSection(section.id, { image: e.target.value })
                        }
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Texto</Label>
                    <TextArea
                      rows={4}
                      value={section.text}
                      onChange={(value) => updateSection(section.id, { text: value })}
                      placeholder="Contenido de la seccion"
                    />
                  </div>

                  <div>
                    <Label>Biblioteca S3 Seccion</Label>
                    <S3ImageManager
                      selectedUrl={section.image}
                      onSelect={(url) => updateSection(section.id, { image: url })}
                    />
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Preview
                    </p>
                    <div className={`grid gap-4 ${getPreviewClasses(index)}`}>
                      <div className={imageFirst ? "order-1" : "order-2"}>
                        <div className="h-48 overflow-hidden rounded-2xl bg-gray-200 dark:bg-gray-800">
                          {section.image ? (
                            <img
                              src={section.image}
                              alt={section.title || `Section ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-gray-400">
                              Imagen de la seccion
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={imageFirst ? "order-2" : "order-1"}>
                        <h5 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                          {section.title || "Titulo de la seccion"}
                        </h5>
                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {section.text || "El texto de la seccion aparecera aqui."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ComponentCard>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="mx-4 max-w-7xl p-0">
        <div className="max-h-[88vh] overflow-y-auto bg-[#e3e3e3] p-3 sm:p-5">
          <div className="mx-auto w-full max-w-[1100px] overflow-hidden rounded-[22px] bg-white text-[#1e1e1e]">
            <header className="bg-[#efefef]">
              <h1 className="px-4 py-3 text-center text-[20px] font-semibold text-[#153a84] sm:text-[34px]">
                {safeProgram.title || "Destination Title"}
              </h1>
            </header>

            <section className="relative h-[300px] overflow-hidden sm:h-[480px]">
              {activeHeroSlide ? (
                <img
                  src={activeHeroSlide.image}
                  alt={safeProgram.title || "Destination"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[#cfcfcf] text-sm text-gray-600">
                  Imagen principal del programa
                </div>
              )}
              <div className="absolute inset-0 bg-black/10" />
              {activeHeroSlide && (
                <a
                  href={activeHeroSlide.applyNowUrl || safeProgram.applyOnlineUrl || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-4 top-6 inline-flex min-h-[64px] min-w-[220px] items-center justify-center rounded-[8px] bg-[#49549a] px-6 py-3 text-[24px] font-semibold uppercase tracking-[0.01em] text-white transition hover:bg-[#3f4a8a] sm:right-8 sm:top-24"
                >
                  Apply Now
                </a>
              )}
              <div className="absolute bottom-8 left-1/2 w-[92%] -translate-x-1/2 px-3 sm:bottom-14 sm:w-auto">
                <span className="inline-block bg-black/65 px-5 py-2 text-center text-[44px] font-medium uppercase leading-none tracking-tight text-white sm:text-[82px]">
                  {activeHeroSlide?.caption || DEFAULT_HERO_CAPTION}
                </span>
              </div>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                {validHeroSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setCarouselIndex(index)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      index === carouselIndex ? "bg-white" : "bg-white/55"
                    }`}
                  />
                ))}
              </div>
              {validHeroSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setCarouselIndex((current) =>
                        current === 0 ? validHeroSlides.length - 1 : current - 1
                      )
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-[#3f4c90]/80 px-4 py-2 text-3xl leading-none text-white transition hover:bg-[#37447f] sm:left-8"
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCarouselIndex((current) => (current + 1) % validHeroSlides.length)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-[#3f4c90]/80 px-4 py-2 text-3xl leading-none text-white transition hover:bg-[#37447f] sm:right-8"
                  >
                    {">"}
                  </button>
                </>
              )}
            </section>

            <section className="space-y-8 bg-white px-6 py-10 sm:px-10">
              <h2 className="text-[26px] font-semibold leading-tight text-[#1e3f8f] sm:text-[39px]">
                {safeProgram.title
                  ? `${safeProgram.title} - Destination Overview`
                  : "Destination Overview"}
              </h2>

              {(safeProgram.mainText || "El texto principal del programa aparecera aqui.")
                .split(/\n+/)
                .filter((block) => block.trim().length > 0)
                .map((block, index) => (
                  <p key={index} className="text-[18px] leading-7 text-[#2a2a2a]">
                    {block}
                  </p>
                ))}

              {(safeProgram.learnMoreUrl || safeProgram.applyOnlineUrl) && (
                <div className="flex flex-wrap items-center gap-4 pt-3">
                  {safeProgram.learnMoreUrl && (
                    <a
                      href={safeProgram.learnMoreUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[48px] min-w-[220px] items-center justify-center rounded-[8px] border border-[#b9b089] bg-transparent px-7 py-3 text-[18px] font-medium uppercase tracking-[0.02em] text-[#817848] transition hover:bg-[#f1eedf]"
                    >
                      Learn More
                    </a>
                  )}
                  {safeProgram.applyOnlineUrl && (
                    <a
                      href={safeProgram.applyOnlineUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[48px] min-w-[260px] items-center justify-center rounded-[8px] bg-[#2e3a84] px-7 py-3 text-[18px] font-medium uppercase tracking-[0.02em] text-white transition hover:bg-[#25306f]"
                    >
                      Apply Online
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-12 pt-4">
                {safeProgram.sections.map((section, index) => {
                  const imageFirst = index % 2 === 0;
                  const textBlocks = (section.text || "El texto de la seccion aparecera aqui.")
                    .split(/\n+/)
                    .filter((block) => block.trim().length > 0);

                  return (
                    <article
                      key={section.id}
                      className="grid gap-6 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)] md:items-start"
                    >
                      <div
                        className={
                          imageFirst
                            ? "order-1"
                            : "order-1 md:order-2"
                        }
                      >
                        <div className="overflow-hidden border border-[#bbbbbb] bg-[#d6d6d6]">
                          {section.image ? (
                            <img
                              src={section.image}
                              alt={section.title || `Section ${index + 1}`}
                              className="h-[250px] w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-[250px] items-center justify-center text-sm text-gray-600">
                              Imagen de la seccion
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className={
                          imageFirst
                            ? "order-2"
                            : "order-2 md:order-1"
                        }
                      >
                        <h3 className="text-[30px] font-semibold leading-tight text-[#1e3f8f] sm:text-[44px]">
                          {section.title || "Titulo de la seccion"}
                        </h3>
                        <div className="mt-4 space-y-4">
                          {textBlocks.map((block, blockIndex) => (
                            <p
                              key={blockIndex}
                              className="text-[17px] leading-7 text-[#2f2f2f]"
                            >
                              {block}
                            </p>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </Modal>
    </>
  );
}



