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
import {
  createCategory as createCategoryRequest,
  createEmptyCategory,
  createEmptyCategoryAddon,
  createEmptyCategoryDetail,
  createEmptyCategoryHero,
  createEmptyCategoryInformation,
  createEmptyCategoryPlayer,
  createEmptyCategorySection,
  createEmptyCategoryVariation,
  fetchCategory,
  normalizeEnabled,
  updateCategory as updateCategoryRequest,
} from "./categoryData";
import type {
  Category as CategoryData,
  CategoryAddon,
  CategoryDetail,
  CategoryHero,
  CategoryInformation,
  CategoryPlayer,
  CategorySection,
  CategoryVariation,
} from "./categoryData";

const removeAt = <T,>(items: T[], index: number): T[] =>
  items.filter((_, itemIndex) => itemIndex !== index);

export default function Category() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [category, setCategory] = useState<CategoryData | null>(null);
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

  const emptyCategory = useMemo(
    () =>
      createEmptyCategory(
        decodedId === "new" || decodedId === "" ? undefined : decodedId
      ),
    [decodedId]
  );

  useEffect(() => {
    if (decodedId === "" || decodedId === "new") {
      setCategory(createEmptyCategory());
      setLoadError(decodedId === "" ? "Id invalido en la URL." : null);
      setLoading(false);
      return;
    }

    let isCurrent = true;

    const loadCategory = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const found = await fetchCategory(decodedId);

        if (!isCurrent) {
          return;
        }

        setCategory(found);
      } catch {
        if (!isCurrent) {
          return;
        }

        setCategory(createEmptyCategory(decodedId));
        setLoadError("No se pudo cargar la categoria del API.");
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    void loadCategory();

    return () => {
      isCurrent = false;
    };
  }, [decodedId]);

  const safeCategory = category ?? emptyCategory;

  const updateCategory = (patch: Partial<CategoryData>) => {
    setCategory({ ...safeCategory, ...patch });
    setSaveMessage(null);
    setSaveError(null);
  };

  const onSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const isNewCategory = decodedId === "new";
      const categoryToSave = isNewCategory
        ? safeCategory
        : { ...safeCategory, category_id: decodedId };
      const savedCategory = isNewCategory
        ? await createCategoryRequest(categoryToSave)
        : await updateCategoryRequest(categoryToSave);

      setCategory(savedCategory);
      setSaveMessage(
        isNewCategory
          ? "Categoria creada correctamente."
          : "Categoria actualizada correctamente."
      );

      if (isNewCategory) {
        navigate(`/categories/${btoa(savedCategory.category_id)}`, {
          replace: true,
        });
      }
    } catch (error) {
      const apiError = error instanceof Error ? ` ${error.message}` : "";
      setSaveError(
        decodedId === "new"
          ? `No se pudo crear la categoria en el API.${apiError}`
          : `No se pudo actualizar la categoria en el API.${apiError}`
      );
    } finally {
      setIsSaving(false);
    }
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

  const updateHero = (index: number, patch: Partial<CategoryHero>) => {
    updateCategory({
      category_hero: safeCategory.category_hero.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateSection = (index: number, patch: Partial<CategorySection>) => {
    updateCategory({
      category_section: safeCategory.category_section.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateDetail = (index: number, patch: Partial<CategoryDetail>) => {
    updateCategory({
      category_details: safeCategory.category_details.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateAddon = (index: number, patch: Partial<CategoryAddon>) => {
    updateCategory({
      category_addons: safeCategory.category_addons.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateVariation = (index: number, patch: Partial<CategoryVariation>) => {
    updateCategory({
      category_variations: safeCategory.category_variations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updatePlayer = (index: number, patch: Partial<CategoryPlayer>) => {
    updateCategory({
      category_players: safeCategory.category_players.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateInformation = (
    index: number,
    patch: Partial<CategoryInformation>
  ) => {
    updateCategory({
      category_information: safeCategory.category_information.map(
        (item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)
      ),
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
          desc="Mantenedor conectado al API v1/category/."
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
              {loadError && (
                <p className="text-sm text-error-600 dark:text-error-400">
                  {loadError}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/categories-list")}
              >
                Back to List
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/categories/preview/${btoa(safeCategory.category_id)}`, {
                    state: { previewCategory: safeCategory },
                  })
                }
              >
                Preview Page
              </Button>
              <Button onClick={onSave} disabled={isSaving || loading}>
                {isSaving ? "Saving..." : "Save Category"}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-6 text-sm text-gray-500 dark:text-gray-400">
              Cargando categoria...
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="category-id">Id</Label>
                  <Input
                    id="category-id"
                    value={safeCategory.category_id}
                    disabled
                  />
                </div>
                <div>
                  <Label>Enabled</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={
                        normalizeEnabled(safeCategory.category_enabled) === 1
                          ? "primary"
                          : "outline"
                      }
                      onClick={() => updateCategory({ category_enabled: true })}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={
                        normalizeEnabled(safeCategory.category_enabled) === 0
                          ? "primary"
                          : "outline"
                      }
                      onClick={() => updateCategory({ category_enabled: false })}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="category-title">Title</Label>
                  <Input
                    id="category-title"
                    value={safeCategory.category_title}
                    onChange={(event) =>
                      updateCategory({ category_title: event.target.value })
                    }
                    placeholder="German University / Soccer College category in Europe"
                  />
                </div>
                <div>
                  <Label htmlFor="category-category">Category</Label>
                  <Input
                    id="category-category"
                    value={safeCategory.category_category}
                    onChange={(event) =>
                      updateCategory({ category_category: event.target.value })
                    }
                    placeholder="Soccer Schools, Camps and International Academies"
                  />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <Label htmlFor="category-date">Date</Label>
                  <Input
                    id="category-date"
                    type="date"
                    value={safeCategory.category_date}
                    onChange={(event) =>
                      updateCategory({ category_date: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="category-status">Status</Label>
                  <Input
                    id="category-status"
                    value={safeCategory.category_status}
                    onChange={(event) =>
                      updateCategory({ category_status: event.target.value })
                    }
                    placeholder="published"
                  />
                </div>
                <div>
                  <Label htmlFor="category-apply">Apply URL</Label>
                  <Input
                    id="category-apply"
                    value={safeCategory.category_apply}
                    onChange={(event) =>
                      updateCategory({ category_apply: event.target.value })
                    }
                    placeholder="/categorys/german-university..."
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <TextArea
                  rows={8}
                  value={safeCategory.category_description}
                  onChange={(value) =>
                    updateCategory({ category_description: value })
                  }
                  placeholder="Descripcion principal de la categoria"
                />
              </div>
            </div>
          )}
        </ComponentCard>

        <ComponentCard title="Hero" desc="Imagenes principales de la categoria.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateCategory({
                  category_hero: [
                    ...safeCategory.category_hero,
                    createEmptyCategoryHero(),
                  ],
                })
              }
            >
              Add Hero
            </Button>
          </div>
          <div className="space-y-4">
            {safeCategory.category_hero.map((item, index) => (
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
                      updateCategory({
                        category_hero: removeAt(safeCategory.category_hero, index),
                      })
                    }
                    disabled={safeCategory.category_hero.length === 1}
                  >
                    Delete
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {renderImageField(`category-hero-${index}`, item.image_url, (url) =>
                    updateHero(index, { image_url: url })
                  )}
                  <div>
                    <Label htmlFor={`category-hero-text-${index}`}>Image Text</Label>
                    <Input
                      id={`category-hero-text-${index}`}
                      value={item.image_text}
                      onChange={(event) =>
                        updateHero(index, { image_text: event.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Sections" desc="Bloques category_section.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateCategory({
                  category_section: [
                    ...safeCategory.category_section,
                    createEmptyCategorySection(safeCategory.category_section.length),
                  ],
                })
              }
            >
              Add Section
            </Button>
          </div>
          <div className="space-y-4">
            {safeCategory.category_section.map((item, index) => (
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
                      updateCategory({
                        category_section: removeAt(
                          safeCategory.category_section,
                          index
                        ),
                      })
                    }
                    disabled={safeCategory.category_section.length === 1}
                  >
                    Delete
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {renderImageField(
                    `category-section-${index}`,
                    item.section_image,
                    (url) => updateSection(index, { section_image: url })
                  )}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`category-section-title-${index}`}>
                        Section Title
                      </Label>
                      <Input
                        id={`category-section-title-${index}`}
                        value={item.section_title}
                        onChange={(event) =>
                          updateSection(index, { section_title: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`category-section-order-${index}`}>
                        Section Order
                      </Label>
                      <Input
                        id={`category-section-order-${index}`}
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
                  <TextArea
                    rows={6}
                    value={item.section_text}
                    onChange={(value) => updateSection(index, { section_text: value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Details" desc="Bloques category_details.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateCategory({
                  category_details: [
                    ...safeCategory.category_details,
                    createEmptyCategoryDetail(),
                  ],
                })
              }
            >
              Add Detail
            </Button>
          </div>
          <div className="space-y-4">
            {safeCategory.category_details.map((item, index) => (
              <div
                key={`detail-${index}`}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Detail {index + 1}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateCategory({
                        category_details: removeAt(
                          safeCategory.category_details,
                          index
                        ),
                      })
                    }
                    disabled={safeCategory.category_details.length === 1}
                  >
                    Delete
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Label htmlFor={`category-detail-title-${index}`}>
                      Detail Title
                    </Label>
                    <Input
                      id={`category-detail-title-${index}`}
                      value={item.detail_title}
                      onChange={(event) =>
                        updateDetail(index, { detail_title: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`category-detail-file-${index}`}>
                      Detail File
                    </Label>
                    <Input
                      id={`category-detail-file-${index}`}
                      value={item.detail_file}
                      onChange={(event) =>
                        updateDetail(index, { detail_file: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Detail Text</Label>
                  <TextArea
                    rows={6}
                    value={item.detail_text}
                    onChange={(value) => updateDetail(index, { detail_text: value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Addons" desc="Bloques category_addons.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateCategory({
                  category_addons: [
                    ...safeCategory.category_addons,
                    createEmptyCategoryAddon(),
                  ],
                })
              }
            >
              Add Addon
            </Button>
          </div>
          <div className="space-y-4">
            {safeCategory.category_addons.map((item, index) => (
              <div
                key={`addon-${index}`}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Addon {index + 1}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateCategory({
                        category_addons: removeAt(
                          safeCategory.category_addons,
                          index
                        ),
                      })
                    }
                    disabled={safeCategory.category_addons.length === 1}
                  >
                    Delete
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Label htmlFor={`category-addon-title-${index}`}>
                      Addon Title
                    </Label>
                    <Input
                      id={`category-addon-title-${index}`}
                      value={item.addons_title}
                      onChange={(event) =>
                        updateAddon(index, { addons_title: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`category-addon-cost-${index}`}>Cost</Label>
                    <Input
                      id={`category-addon-cost-${index}`}
                      value={item.addons_cost}
                      onChange={(event) =>
                        updateAddon(index, { addons_cost: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Description</Label>
                  <TextArea
                    rows={4}
                    value={item.addons_description}
                    onChange={(value) =>
                      updateAddon(index, { addons_description: value })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Variations" desc="Bloques category_variations.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateCategory({
                  category_variations: [
                    ...safeCategory.category_variations,
                    createEmptyCategoryVariation(),
                  ],
                })
              }
            >
              Add Variation
            </Button>
          </div>
          <div className="space-y-4">
            {safeCategory.category_variations.map((item, index) => (
              <div
                key={`variation-${index}`}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Variation {index + 1}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateCategory({
                        category_variations: removeAt(
                          safeCategory.category_variations,
                          index
                        ),
                      })
                    }
                    disabled={safeCategory.category_variations.length === 1}
                  >
                    Delete
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Label htmlFor={`category-variation-description-${index}`}>
                      Description
                    </Label>
                    <Input
                      id={`category-variation-description-${index}`}
                      value={item.variations_description}
                      onChange={(event) =>
                        updateVariation(index, {
                          variations_description: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`category-variation-cost-${index}`}>Cost</Label>
                    <Input
                      id={`category-variation-cost-${index}`}
                      value={item.variations_cost}
                      onChange={(event) =>
                        updateVariation(index, { variations_cost: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`category-variation-dates-${index}`}>
                      Dates
                    </Label>
                    <Input
                      id={`category-variation-dates-${index}`}
                      value={item.variations_dates}
                      onChange={(event) =>
                        updateVariation(index, {
                          variations_dates: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`category-variation-deadline-${index}`}>
                      Deadline
                    </Label>
                    <Input
                      id={`category-variation-deadline-${index}`}
                      value={item.variations_deadline}
                      onChange={(event) =>
                        updateVariation(index, {
                          variations_deadline: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Players" desc="Testimonios category_players.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateCategory({
                  category_players: [
                    ...safeCategory.category_players,
                    createEmptyCategoryPlayer(),
                  ],
                })
              }
            >
              Add Player
            </Button>
          </div>
          <div className="space-y-4">
            {safeCategory.category_players.map((item, index) => (
              <div
                key={`player-${index}`}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Player {index + 1}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateCategory({
                        category_players: removeAt(
                          safeCategory.category_players,
                          index
                        ),
                      })
                    }
                    disabled={safeCategory.category_players.length === 1}
                  >
                    Delete
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {renderImageField(
                    `category-player-${index}`,
                    item.player_image,
                    (url) => updatePlayer(index, { player_image: url })
                  )}
                  <div>
                    <Label htmlFor={`category-player-description-${index}`}>
                      Player Description
                    </Label>
                    <Input
                      id={`category-player-description-${index}`}
                      value={item.player_description}
                      onChange={(event) =>
                        updatePlayer(index, {
                          player_description: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Player Says</Label>
                  <TextArea
                    rows={4}
                    value={item.player_says}
                    onChange={(value) => updatePlayer(index, { player_says: value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </ComponentCard>

        <ComponentCard title="Information" desc="Bloques category_information.">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() =>
                updateCategory({
                  category_information: [
                    ...safeCategory.category_information,
                    createEmptyCategoryInformation(),
                  ],
                })
              }
            >
              Add Information
            </Button>
          </div>
          <div className="space-y-4">
            {safeCategory.category_information.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay informacion adicional.
              </p>
            )}
            {safeCategory.category_information.map((item, index) => (
              <div
                key={`information-${index}`}
                className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    Information {index + 1}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateCategory({
                        category_information: removeAt(
                          safeCategory.category_information,
                          index
                        ),
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
                <div>
                  <Label htmlFor={`category-information-title-${index}`}>
                    Information Title
                  </Label>
                  <Input
                    id={`category-information-title-${index}`}
                    value={item.information_title}
                    onChange={(event) =>
                      updateInformation(index, {
                        information_title: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="mt-4">
                  <Label>Information Text</Label>
                  <TextArea
                    rows={4}
                    value={item.information_text}
                    onChange={(value) =>
                      updateInformation(index, { information_text: value })
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
