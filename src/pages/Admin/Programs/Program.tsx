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
  createEmptyProgram,
  createEmptySection,
  loadPrograms,
  upsertProgram,
} from "./programData";
import type { Program, ProgramSection } from "./programData";

const getPreviewClasses = (index: number) =>
  index % 2 === 0
    ? "lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]"
    : "lg:grid-cols-[minmax(0,1fr)_minmax(0,220px)]";

export default function Program() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isOpen, openModal, closeModal } = useModal();

  const [program, setProgram] = useState<Program | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
      setProgram(createEmptyProgram());
      return;
    }

    if (decodedId === "new") {
      setProgram(createEmptyProgram());
      return;
    }

    const found = loadPrograms().find((item) => item.id === decodedId);
    setProgram(found ?? createEmptyProgram());
  }, [decodedId]);

  const safeProgram = program ?? createEmptyProgram();

  const updateProgram = (patch: Partial<Program>) => {
    setProgram({ ...safeProgram, ...patch });
    setSaveMessage(null);
  };

  const updateSection = (
    sectionId: string,
    patch: Partial<ProgramSection>
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
        createEmptySection(safeProgram.sections.length),
      ],
    });
  };

  const removeSection = (sectionId: string) => {
    updateProgram({
      sections: safeProgram.sections.filter((section) => section.id !== sectionId),
    });
  };

  const onSave = () => {
    upsertProgram(safeProgram);
    setSaveMessage("Programa guardado localmente.");

    if (decodedId === "new") {
      navigate(`/programs/${btoa(safeProgram.id)}`, { replace: true });
    }
  };

  return (
    <>
      <PageMeta title="Program" description="Program editor" />
      <PageBreadcrumb
        pageTitle={decodedId === "new" ? "New Program" : "Program Detail"}
      />
      <div className="space-y-6">
        <ComponentCard
          title={decodedId === "new" ? "New Program" : "Program"}
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
                Preview Program
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/programs-list")}
              >
                Back to List
              </Button>
              <Button onClick={onSave}>Save Program</Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <Label htmlFor="program-title">Titulo</Label>
              <Input
                id="program-title"
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

          <div>
            <Label htmlFor="program-main-image">Imagen Principal</Label>
            <Input
              id="program-main-image"
              value={safeProgram.mainImage}
              onChange={(e) => updateProgram({ mainImage: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div>
            <Label>Biblioteca S3 Imagen Principal</Label>
            <S3ImageManager
              selectedUrl={safeProgram.mainImage}
              onSelect={(url) => updateProgram({ mainImage: url })}
            />
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
        </ComponentCard>

        <ComponentCard
          title="Sections Builder"
          desc="Cada seccion alterna automaticamente la disposicion entre imagen-izquierda y imagen-derecha."
        >
          <div className="flex justify-end">
            <Button onClick={addSection}>Add Section</Button>
          </div>

          {safeProgram.sections.map((section, index) => {
            const imageFirst = index % 2 === 0;

            return (
              <div
                key={section.id}
                className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
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
        </ComponentCard>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="mx-4 max-w-6xl p-6 sm:p-8">
        <div className="max-h-[85vh] overflow-y-auto pr-1">
          <div className="overflow-hidden rounded-[28px] bg-white dark:bg-gray-900">
            <section className="rounded-[28px] bg-gray-950 px-6 py-8 text-white sm:px-10 sm:py-12">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
                <div className="space-y-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
                    Program Preview
                  </p>
                  <h1 className="text-3xl font-semibold sm:text-5xl">
                    {safeProgram.title || "Program Title"}
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                    {safeProgram.mainText || "El texto principal del programa aparecera aqui."}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={safeProgram.learnMoreUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-200"
                    >
                      Learn More
                    </a>
                    <a
                      href={safeProgram.applyOnlineUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Apply Online
                    </a>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] bg-white/10">
                  {safeProgram.mainImage ? (
                    <img
                      src={safeProgram.mainImage}
                      alt={safeProgram.title || "Program"}
                      className="h-[320px] w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[320px] items-center justify-center text-sm text-white/50">
                      Imagen principal del programa
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-8 px-6 py-8 sm:px-10 sm:py-12">
              {safeProgram.sections.map((section, index) => {
                const imageFirst = index % 2 === 0;

                return (
                  <div
                    key={section.id}
                    className={`grid gap-6 rounded-[28px] border border-gray-200 p-5 dark:border-gray-800 ${getPreviewClasses(
                      index
                    )}`}
                  >
                    <div className={imageFirst ? "order-1" : "order-2"}>
                      <div className="overflow-hidden rounded-[22px] bg-gray-100 dark:bg-gray-800">
                        {section.image ? (
                          <img
                            src={section.image}
                            alt={section.title || `Section ${index + 1}`}
                            className="h-[260px] w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
                            Imagen de la seccion
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={imageFirst ? "order-2" : "order-1"}>
                      <div className="flex h-full flex-col justify-center">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
                          {section.title || "Titulo de la seccion"}
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
                          {section.text || "El texto de la seccion aparecera aqui."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        </div>
      </Modal>
    </>
  );
}
