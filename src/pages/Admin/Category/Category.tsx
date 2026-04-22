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

export default function Category() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

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

  const openPreview = () => {
    const previewId = decodedId === "new" ? "new" : btoa(safeCategory.id);
    navigate(`/categories/preview/${previewId}`, {
      state: { previewCategory: safeCategory },
    });
  };

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
              <Button variant="outline" onClick={openPreview}>
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
        </ComponentCard>

        <ComponentCard
          title="Sections Builder"
          desc="Secciones dinamicas con foto, titulo, texto y enlaces de accion."
        >
          <div className="flex justify-end">
            <Button onClick={addSection}>Add Section</Button>
          </div>

          {safeCategory.sections.map((section, index) => (
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
        </ComponentCard>
      </div>
    </>
  );
}
