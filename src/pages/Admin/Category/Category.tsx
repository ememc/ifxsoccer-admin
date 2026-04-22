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
  createEmptyCategory,
  createEmptyCategorySection,
  loadCategories,
  upsertCategory,
} from "./categoryData";
import type {
  Category as CategoryData,
  CategorySection,
} from "./categoryData";

const chunkSections = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export default function Category() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isOpen, openModal, closeModal } = useModal();

  const [category, setCategory] = useState<CategoryData | null>(null);
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
    if (decodedId === "" || decodedId === "new") {
      setCategory(createEmptyCategory());
      return;
    }

    const found = loadCategories().find((item) => item.id === decodedId);
    setCategory(found ?? createEmptyCategory());
  }, [decodedId]);

  const safeCategory = category ?? createEmptyCategory();

  const updateCategory = (patch: Partial<CategoryData>) => {
    setCategory({ ...safeCategory, ...patch });
    setSaveMessage(null);
  };

  const updateSection = (
    sectionId: string,
    patch: Partial<CategorySection>
  ) => {
    updateCategory({
      sections: safeCategory.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section
      ),
    });
  };

  const addSection = () => {
    updateCategory({
      sections: [
        ...safeCategory.sections,
        createEmptyCategorySection(safeCategory.sections.length),
      ],
    });
  };

  const removeSection = (sectionId: string) => {
    updateCategory({
      sections: safeCategory.sections.filter((section) => section.id !== sectionId),
    });
  };

  const onSave = () => {
    upsertCategory(safeCategory);
    setSaveMessage("Categoria guardada localmente.");

    if (decodedId === "new") {
      navigate(`/categories/${btoa(safeCategory.id)}`, { replace: true });
    }
  };

  const visibleSections = safeCategory.sections.filter(
    (section) => section.enabled === 1
  );
  const sectionGroups = chunkSections(visibleSections, 3);

  return (
    <>
      <PageMeta title="Category" description="Category editor" />
      <PageBreadcrumb
        pageTitle={decodedId === "new" ? "New Category" : "Category Detail"}
      />
      <div className="space-y-6">
        <ComponentCard
          title={decodedId === "new" ? "New Category" : "Category"}
          desc="Front provisional con persistencia local mientras definimos el resto del contenido."
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
                Preview Page
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/categories-list")}
              >
                Back to List
              </Button>
              <Button onClick={onSave}>Save Category</Button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#3558a8] bg-[#f5f8ff] p-4 dark:border-[#4f6cb2] dark:bg-[#101a33]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#234487] dark:text-[#9fb5e8]">
                Main Category Content
              </h3>
              <span className="rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
                Principal
              </span>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="category-title">Titulo</Label>
                  <Input
                    id="category-title"
                    value={safeCategory.title}
                    onChange={(e) => updateCategory({ title: e.target.value })}
                    placeholder="Nombre de la categoria"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={safeCategory.enabled === 1 ? "primary" : "outline"}
                      onClick={() => updateCategory({ enabled: 1 })}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={safeCategory.enabled === 0 ? "primary" : "outline"}
                      onClick={() => updateCategory({ enabled: 0 })}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="category-image">Foto Principal</Label>
                <Input
                  id="category-image"
                  value={safeCategory.image}
                  onChange={(e) => updateCategory({ image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Biblioteca S3 Foto Principal</Label>
                <S3ImageManager
                  selectedUrl={safeCategory.image}
                  onSelect={(url) => updateCategory({ image: url })}
                />
              </div>

              <div>
                <Label>Texto Principal</Label>
                <TextArea
                  rows={6}
                  value={safeCategory.mainText}
                  onChange={(value) => updateCategory({ mainText: value })}
                  placeholder="Descripcion principal de la categoria"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="category-learn-more-url">Learn More URL</Label>
                  <Input
                    id="category-learn-more-url"
                    value={safeCategory.learnMoreUrl}
                    onChange={(e) =>
                      updateCategory({ learnMoreUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="category-apply-online-url">Apply Online URL</Label>
                  <Input
                    id="category-apply-online-url"
                    value={safeCategory.applyOnlineUrl}
                    onChange={(e) =>
                      updateCategory({ applyOnlineUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Sections Builder"
          desc="Secciones dinamicas con foto, titulo, texto y enlaces de accion."
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

            {safeCategory.sections.map((section, index) => (
              <div
                key={section.id}
                className={`mb-4 rounded-2xl border-2 p-4 ${
                  index % 2 === 0
                    ? "border-[#9eb4e7] bg-white dark:border-[#4a5f91] dark:bg-gray-900/60"
                    : "border-[#bfd0f2] bg-[#f8fbff] dark:border-[#516799] dark:bg-gray-900/40"
                }`}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="mb-1 inline-flex rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
                      Section {index + 1}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Esta tarjeta aparecera en el preview dentro del grupo de 3.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={section.enabled === 1 ? "primary" : "outline"}
                      size="sm"
                      onClick={() => updateSection(section.id, { enabled: 1 })}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={section.enabled === 0 ? "primary" : "outline"}
                      size="sm"
                      onClick={() => updateSection(section.id, { enabled: 0 })}
                    >
                      Disabled
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeSection(section.id)}
                      disabled={safeCategory.sections.length === 1}
                    >
                      Delete Section
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Label htmlFor={`category-section-title-${section.id}`}>
                      Titulo
                    </Label>
                    <Input
                      id={`category-section-title-${section.id}`}
                      value={section.title}
                      onChange={(e) =>
                        updateSection(section.id, { title: e.target.value })
                      }
                      placeholder="Titulo de la seccion"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`category-section-image-${section.id}`}>
                      Foto
                    </Label>
                    <Input
                      id={`category-section-image-${section.id}`}
                      value={section.image}
                      onChange={(e) =>
                        updateSection(section.id, { image: e.target.value })
                      }
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <Label>Biblioteca S3 Foto</Label>
                  <S3ImageManager
                    selectedUrl={section.image}
                    onSelect={(url) => updateSection(section.id, { image: url })}
                  />
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

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Label htmlFor={`category-section-learn-${section.id}`}>
                      Learn More URL
                    </Label>
                    <Input
                      id={`category-section-learn-${section.id}`}
                      value={section.learnMoreUrl}
                      onChange={(e) =>
                        updateSection(section.id, {
                          learnMoreUrl: e.target.value,
                        })
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label htmlFor={`category-section-apply-${section.id}`}>
                      Apply Online URL
                    </Label>
                    <Input
                      id={`category-section-apply-${section.id}`}
                      value={section.applyOnlineUrl}
                      onChange={(e) =>
                        updateSection(section.id, {
                          applyOnlineUrl: e.target.value,
                        })
                      }
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} className="mx-4 max-w-7xl p-0">
        <div className="max-h-[88vh] overflow-y-auto bg-[#e3e3e3] p-3 sm:p-5">
          <div className="mx-auto w-full max-w-[1100px] overflow-hidden rounded-[22px] bg-white text-[#1e1e1e]">
            <div className="space-y-7 px-5 py-6 sm:px-10 sm:py-10">
              <h1 className="text-center text-[30px] font-semibold leading-tight text-[#1d4690] sm:text-[46px]">
                {safeCategory.title || "Category Title"}
              </h1>

              <div className="mx-auto max-w-[980px] space-y-2 text-[14px] leading-6 text-[#28313f] sm:text-[16px]">
                {(safeCategory.mainText || "El texto principal de la categoria aparecera aqui.")
                  .split(/\n+/)
                  .filter((line) => line.trim().length > 0)
                  .map((line, lineIndex) => (
                    <p key={lineIndex}>{line}</p>
                  ))}
              </div>

              <div className="space-y-10">
                {sectionGroups.map((group, groupIndex) => (
                  <section
                    key={`group-${groupIndex}`}
                    className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {group.map((section) => (
                      <article key={section.id} className="flex flex-col">
                        <div className="h-[180px] overflow-hidden bg-[#d2d2d2] sm:h-[220px]">
                          {section.image ? (
                            <img
                              src={section.image}
                              alt={section.title || "Category section"}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.src = "/images/logo/ifx-logo.png";
                              }}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-gray-500">
                              Imagen de la seccion
                            </div>
                          )}
                        </div>
                        <div className="mt-2">
                          <h2 className="text-[24px] font-medium uppercase leading-tight text-[#1d3570] sm:text-[28px]">
                            {section.title || "Titulo de la seccion"}
                          </h2>
                          <p className="mt-2 line-clamp-3 min-h-[72px] text-[13px] leading-6 text-[#394457] sm:text-[14px]">
                            {section.text || "El texto de la seccion aparecera aqui."}
                          </p>
                          <div className="mt-4 flex items-center gap-3">
                            <a
                              href={section.learnMoreUrl || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-[38px] min-w-[120px] items-center justify-center px-4 text-[13px] font-medium uppercase tracking-[0.02em] text-[#8a8253] transition hover:text-[#6e673f]"
                            >
                              Learn More
                            </a>
                            <a
                              href={section.applyOnlineUrl || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-[38px] min-w-[140px] items-center justify-center rounded-[4px] bg-[#2e3a84] px-4 text-[13px] font-semibold uppercase tracking-[0.02em] text-white transition hover:bg-[#23306f]"
                            >
                              Apply Online
                            </a>
                          </div>
                        </div>
                      </article>
                    ))}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
