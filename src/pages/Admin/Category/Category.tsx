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
import { getVideoPreview } from "../../../utils/videoPreview";
import { fetchImages } from "../Images/imageData";
import type { ImageItem } from "../Images/imageData";
import { fetchPrograms } from "../Programs/programData";
import type { Program } from "../Programs/programData";
import { fetchVideos } from "../Videos/videoData";
import type { VideoItem } from "../Videos/videoData";
import {
  createCategory as createCategoryRequest,
  createEmptyCategory,
  createEmptyCategoryCamp,
  createEmptyCategoryImage,
  createEmptyCategorySection,
  createEmptyCategoryVideo,
  fetchCategory,
  normalizeEnabled,
  updateCategory as updateCategoryRequest,
} from "./categoryData";
import type {
  Category as CategoryData,
  CategoryCamp,
  CategoryImage,
  CategorySection,
  CategoryVideo,
} from "./categoryData";

const removeAt = <T,>(items: T[], index: number): T[] =>
  items.filter((_, itemIndex) => itemIndex !== index);

const tabOptions = [
  { id: "main", label: "Main" },
  { id: "programs", label: "Programs" },
  { id: "sections", label: "Sections" },
  { id: "videos", label: "Videos" },
  { id: "images", label: "Images" },
] as const;

type CategoryTab = (typeof tabOptions)[number]["id"];
type PickerTarget = "programs" | "videos" | "images";

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

export default function Category() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const previewModal = useModal();
  const pickerModal = useModal();

  const [category, setCategory] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryTab>("main");

  const [programOptions, setProgramOptions] = useState<Program[]>([]);
  const [videoOptions, setVideoOptions] = useState<VideoItem[]>([]);
  const [imageOptions, setImageOptions] = useState<ImageItem[]>([]);

  const [pickerTarget, setPickerTarget] = useState<PickerTarget>("programs");
  const [pickerReplaceIndex, setPickerReplaceIndex] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategory, setPickerCategory] = useState("all");

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
    () => createEmptyCategory(decodedId === "new" || decodedId === "" ? undefined : decodedId),
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

  useEffect(() => {
    let isCurrent = true;

    const loadRelations = async () => {
      const [programsResult, videosResult, imagesResult] = await Promise.allSettled([
        fetchPrograms(),
        fetchVideos(),
        fetchImages(),
      ]);

      if (!isCurrent) {
        return;
      }

      setProgramOptions(programsResult.status === "fulfilled" ? programsResult.value : []);
      setVideoOptions(videosResult.status === "fulfilled" ? videosResult.value : []);
      setImageOptions(imagesResult.status === "fulfilled" ? imagesResult.value : []);
    };

    void loadRelations();

    return () => {
      isCurrent = false;
    };
  }, []);

  const safeCategory = category ?? emptyCategory;
  const previewImage = resolveS3ImageUrl(safeCategory.category_image);
  const previewDate = useMemo(
    () => formatPreviewDate(safeCategory.category_date),
    [safeCategory.category_date]
  );

  const programMap = useMemo(
    () => new Map(programOptions.map((item) => [item.program_id, item])),
    [programOptions]
  );
  const videoMap = useMemo(
    () => new Map(videoOptions.map((item) => [item.id, item])),
    [videoOptions]
  );
  const imageMap = useMemo(
    () => new Map(imageOptions.map((item) => [item.id, item])),
    [imageOptions]
  );

  const programCategoryOptions = useMemo(() => {
    const unique = new Set(
      programOptions
        .map((item) => item.program_category.trim())
        .filter((item) => item.length > 0)
    );

    return ["all", ...Array.from(unique).sort((first, second) => first.localeCompare(second))];
  }, [programOptions]);

  const pickerItems = useMemo(() => {
    const normalizedSearch = pickerSearch.trim().toLowerCase();

    if (pickerTarget === "programs") {
      return programOptions.filter((item) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          item.program_title.toLowerCase().includes(normalizedSearch) ||
          item.program_description.toLowerCase().includes(normalizedSearch) ||
          item.program_id.toLowerCase().includes(normalizedSearch);
        const matchesCategory =
          pickerCategory === "all" || item.program_category === pickerCategory;

        return matchesSearch && matchesCategory;
      });
    }

    if (pickerTarget === "videos") {
      return videoOptions.filter((item) => {
        if (pickerCategory !== "all") {
          return false;
        }

        return (
          normalizedSearch.length === 0 ||
          item.title.toLowerCase().includes(normalizedSearch) ||
          item.id.toLowerCase().includes(normalizedSearch)
        );
      });
    }

    return imageOptions.filter((item) => {
      if (pickerCategory !== "all") {
        return false;
      }

      return (
        normalizedSearch.length === 0 ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.id.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [imageOptions, pickerCategory, pickerSearch, pickerTarget, programOptions, videoOptions]);

  const updateCategory = (patch: Partial<CategoryData>) => {
    setCategory({ ...safeCategory, ...patch });
    setSaveMessage(null);
    setSaveError(null);
  };

  const updateCamp = (index: number, patch: Partial<CategoryCamp>) => {
    updateCategory({
      category_camps: safeCategory.category_camps.map((item, itemIndex) =>
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

  const updateVideo = (index: number, patch: Partial<CategoryVideo>) => {
    updateCategory({
      category_videos: safeCategory.category_videos.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const updateImage = (index: number, patch: Partial<CategoryImage>) => {
    updateCategory({
      category_images: safeCategory.category_images.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    });
  };

  const openPicker = (target: PickerTarget, replaceIndex: number | null = null) => {
    setPickerTarget(target);
    setPickerReplaceIndex(replaceIndex);
    setPickerSearch("");
    setPickerCategory("all");
    pickerModal.openModal();
  };

  const onSelectPickerItem = (selectedId: string) => {
    if (pickerTarget === "programs") {
      if (pickerReplaceIndex === null) {
        updateCategory({
          category_camps: [
            ...safeCategory.category_camps,
            createEmptyCategoryCamp(safeCategory.category_camps.length + 1),
          ].map((item, index, items) =>
            index === items.length - 1 ? { ...item, program_id: selectedId } : item
          ),
        });
      } else {
        updateCamp(pickerReplaceIndex, { program_id: selectedId });
      }
    }

    if (pickerTarget === "videos") {
      if (pickerReplaceIndex === null) {
        updateCategory({
          category_videos: [
            ...safeCategory.category_videos,
            { ...createEmptyCategoryVideo(safeCategory.category_videos.length + 1), video_id: selectedId },
          ],
        });
      } else {
        updateVideo(pickerReplaceIndex, { video_id: selectedId });
      }
    }

    if (pickerTarget === "images") {
      if (pickerReplaceIndex === null) {
        updateCategory({
          category_images: [
            ...safeCategory.category_images,
            { ...createEmptyCategoryImage(safeCategory.category_images.length + 1), image_id: selectedId },
          ],
        });
      } else {
        updateImage(pickerReplaceIndex, { image_id: selectedId });
      }
    }

    pickerModal.closeModal();
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
        navigate(`/categories/${btoa(savedCategory.category_id)}`, { replace: true });
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

  const renderProgramsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openPicker("programs")}>Buscar Programa</Button>
      </div>

      {safeCategory.category_camps.length === 0 && (
        <EmptyTabState text="Aun no hay programas relacionados." />
      )}

      {safeCategory.category_camps.map((item, index) => {
        const linkedProgram = programMap.get(item.program_id);

        return (
          <div key={`camp-${index}`} className={panelCardClass}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Program {index + 1}
              </h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openPicker("programs", index)}>
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateCategory({
                      category_camps: removeAt(safeCategory.category_camps, index),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <Label htmlFor={`category-camp-id-${index}`}>Program Id</Label>
                <Input
                  id={`category-camp-id-${index}`}
                  value={item.program_id}
                  onChange={(event) => updateCamp(index, { program_id: event.target.value })}
                  placeholder="Program id"
                />
              </div>
              <div>
                <Label htmlFor={`category-camp-order-${index}`}>Order</Label>
                <Input
                  id={`category-camp-order-${index}`}
                  type="number"
                  value={item.program_order}
                  onChange={(event) =>
                    updateCamp(index, {
                      program_order: Number(event.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Button
                    variant={normalizeEnabled(item.program_enabled) === 1 ? "primary" : "outline"}
                    size="sm"
                    onClick={() => updateCamp(index, { program_enabled: true })}
                  >
                    Enabled
                  </Button>
                  <Button
                    variant={normalizeEnabled(item.program_enabled) === 0 ? "primary" : "outline"}
                    size="sm"
                    onClick={() => updateCamp(index, { program_enabled: false })}
                  >
                    Disabled
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-4 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {linkedProgram?.program_title || "Programa no encontrado"}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {linkedProgram?.program_category || item.program_id || "Selecciona un programa desde el modal."}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderSectionsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
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

      {safeCategory.category_section.length === 0 && (
        <EmptyTabState text="Aun no hay sections." />
      )}

      {safeCategory.category_section.map((item, index) => (
        <div key={`section-${index}`} className={panelCardClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              Section {index + 1}
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateCategory({
                  category_section: removeAt(safeCategory.category_section, index),
                })
              }
            >
              Delete
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {renderImageField(`category-section-${index}`, item.section_image, (url) =>
              updateSection(index, { section_image: url })
            )}
            <div className="space-y-4">
              <div>
                <Label htmlFor={`category-section-title-${index}`}>Section Title</Label>
                <Input
                  id={`category-section-title-${index}`}
                  value={item.section_title}
                  onChange={(event) =>
                    updateSection(index, { section_title: event.target.value })
                  }
                  placeholder="Titulo de la seccion"
                />
              </div>
              <div>
                <Label htmlFor={`category-section-order-${index}`}>Section Order</Label>
                <Input
                  id={`category-section-order-${index}`}
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
                  rows={6}
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

  const renderVideosTab = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openPicker("videos")}>Buscar Video</Button>
      </div>

      {safeCategory.category_videos.length === 0 && (
        <EmptyTabState text="Aun no hay videos relacionados." />
      )}

      {safeCategory.category_videos.map((item, index) => {
        const linkedVideo = videoMap.get(item.video_id);
        const preview = linkedVideo ? getVideoPreview(linkedVideo.videoUrl) : null;

        return (
          <div key={`video-${index}`} className={panelCardClass}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Video {index + 1}
              </h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openPicker("videos", index)}>
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateCategory({
                      category_videos: removeAt(safeCategory.category_videos, index),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`category-video-id-${index}`}>Video Id</Label>
                  <Input
                    id={`category-video-id-${index}`}
                    value={item.video_id}
                    onChange={(event) => updateVideo(index, { video_id: event.target.value })}
                    placeholder="Video id"
                  />
                </div>
                <div>
                  <Label htmlFor={`category-video-order-${index}`}>Order</Label>
                  <Input
                    id={`category-video-order-${index}`}
                    type="number"
                    value={item.video_order}
                    onChange={(event) =>
                      updateVideo(index, { video_order: Number(event.target.value) || 0 })
                    }
                  />
                </div>
                <div className="rounded-xl border border-dashed border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {linkedVideo?.title || "Video no encontrado"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {item.video_id || "Selecciona un video desde el modal."}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-white/[0.08]">
                {preview?.kind === "youtube" && (
                  <img
                    src={preview.thumbnailUrl}
                    alt={linkedVideo?.title || "Video preview"}
                    className="aspect-video w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = "/images/logo/ifx-logo.png";
                    }}
                  />
                )}
                {preview?.kind === "file" && (
                  <video
                    src={preview.sourceUrl}
                    className="aspect-video w-full bg-black"
                    controls
                    preload="metadata"
                  />
                )}
                {!preview && (
                  <div className="flex aspect-video items-center justify-center text-sm text-gray-400">
                    Preview
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderImagesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openPicker("images")}>Buscar Imagen</Button>
      </div>

      {safeCategory.category_images.length === 0 && (
        <EmptyTabState text="Aun no hay imagenes relacionadas." />
      )}

      {safeCategory.category_images.map((item, index) => {
        const linkedImage = imageMap.get(item.image_id);
        const previewUrl = resolveS3ImageUrl(linkedImage?.imageUrl ?? "");

        return (
          <div key={`image-${index}`} className={panelCardClass}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Image {index + 1}
              </h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openPicker("images", index)}>
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateCategory({
                      category_images: removeAt(safeCategory.category_images, index),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`category-image-id-${index}`}>Image Id</Label>
                  <Input
                    id={`category-image-id-${index}`}
                    value={item.image_id}
                    onChange={(event) => updateImage(index, { image_id: event.target.value })}
                    placeholder="Image id"
                  />
                </div>
                <div>
                  <Label htmlFor={`category-image-order-${index}`}>Order</Label>
                  <Input
                    id={`category-image-order-${index}`}
                    type="number"
                    value={item.image_order}
                    onChange={(event) =>
                      updateImage(index, { image_order: Number(event.target.value) || 0 })
                    }
                  />
                </div>
                <div className="rounded-xl border border-dashed border-gray-200 p-4 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {linkedImage?.title || "Imagen no encontrada"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {item.image_id || "Selecciona una imagen desde el modal."}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-white/[0.08] dark:bg-gray-900">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={linkedImage?.title || "Image preview"}
                    className="aspect-video w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = "/images/logo/ifx-logo.png";
                    }}
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-sm text-gray-400">
                    Preview
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === "main") {
      return (
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
            <div>
              <Label htmlFor="category-id">Id</Label>
              <Input id="category-id" value={safeCategory.category_id} disabled />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <Label htmlFor="category-head">Head</Label>
                <Input
                  id="category-head"
                  value={safeCategory.category_head}
                  onChange={(event) => updateCategory({ category_head: event.target.value })}
                  placeholder="Youth Soccer Camps"
                />
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex gap-2">
                  <Button
                    variant={normalizeEnabled(safeCategory.category_enabled) === 1 ? "primary" : "outline"}
                    onClick={() => updateCategory({ category_enabled: true })}
                  >
                    Enabled
                  </Button>
                  <Button
                    variant={normalizeEnabled(safeCategory.category_enabled) === 0 ? "primary" : "outline"}
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
                  onChange={(event) => updateCategory({ category_title: event.target.value })}
                  placeholder="2026 International Youth Soccer Camps"
                />
              </div>
              <div>
                <Label htmlFor="category-subtitle">Subtitle</Label>
                <Input
                  id="category-subtitle"
                  value={safeCategory.category_subtitle}
                  onChange={(event) => updateCategory({ category_subtitle: event.target.value })}
                  placeholder="2026 International Youth Soccer Camps"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category-description">Description</Label>
              <TextArea
                rows={4}
                value={safeCategory.category_description}
                onChange={(value) => updateCategory({ category_description: value })}
                placeholder="Descripcion principal"
              />
            </div>

            <div>
              <Label htmlFor="category-text">Body Text</Label>
              <TextArea
                rows={8}
                value={safeCategory.category_text}
                onChange={(value) => updateCategory({ category_text: value })}
                placeholder="Texto largo de la categoria"
              />
            </div>

            {renderImageField("category-main", safeCategory.category_image, (url) =>
              updateCategory({ category_image: url })
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <Label htmlFor="category-apply">Apply URL</Label>
                <Input
                  id="category-apply"
                  value={safeCategory.category_apply}
                  onChange={(event) => updateCategory({ category_apply: event.target.value })}
                  placeholder="/categorys/..."
                />
              </div>
              <div>
                <Label htmlFor="category-date">Fecha de Publicacion</Label>
                <Input
                  id="category-date"
                  type="date"
                  value={safeCategory.category_date}
                  onChange={(event) => updateCategory({ category_date: event.target.value })}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "programs") {
      return renderProgramsTab();
    }

    if (activeTab === "sections") {
      return renderSectionsTab();
    }

    if (activeTab === "videos") {
      return renderVideosTab();
    }

    return renderImagesTab();
  };

  return (
    <>
      <PageMeta title="Category" description="Category editor" />
      <PageBreadcrumb pageTitle={decodedId === "new" ? "New Category" : "Category Detail"} />

      <div className="space-y-6">
        <div className="sticky top-4 z-20 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {decodedId === "new" ? "New Category" : "Category Detail"}
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
                    Cargando categoria...
                  </p>
                )}
                {loadError && (
                  <p className="text-sm text-error-600 dark:text-error-400">{loadError}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={previewModal.openModal}>
                Preview Category
              </Button>
              <Button variant="outline" onClick={() => navigate("/categories-list")}>
                Back to List
              </Button>
              <Button
                onClick={() => {
                  void onSave();
                }}
                disabled={loading || isSaving}
              >
                {isSaving ? "Saving..." : "Save Category"}
              </Button>
            </div>
          </div>
        </div>

        <ComponentCard
          title="Category Editor"
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

      <Modal
        isOpen={previewModal.isOpen}
        onClose={previewModal.closeModal}
        className="mx-4 max-w-7xl p-0"
      >
        <div className="max-h-[88vh] overflow-y-auto bg-[#e3e3e3] p-3 sm:p-5">
          <div className="mx-auto w-full max-w-[1100px] overflow-hidden rounded-[22px] bg-white text-[#1e1e1e]">
            <article className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
              <p className="text-[14px] text-[#4a4a4a]">Posted On {previewDate}</p>

              <div className="space-y-2">
                <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#c27a2c]">
                  {safeCategory.category_head || "Category head"}
                </p>
                <h1 className="text-[34px] font-semibold leading-tight text-[#1d3570]">
                  {safeCategory.category_title || "Category title"}
                </h1>
                <p className="text-[20px] text-[#3558a8]">
                  {safeCategory.category_subtitle || "Category subtitle"}
                </p>
                <p className="text-[18px] leading-7 text-[#4a4a4a]">
                  {safeCategory.category_description ||
                    "La descripcion principal de la categoria aparecera aqui."}
                </p>
              </div>

              <div className="overflow-hidden bg-[#d7d7d7]">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={safeCategory.category_title || "Category preview"}
                    className="h-[260px] w-full object-cover sm:h-[560px]"
                    onError={(event) => {
                      event.currentTarget.src = "/images/logo/ifx-logo.png";
                    }}
                  />
                ) : (
                  <div className="flex h-[260px] items-center justify-center text-sm text-gray-500 sm:h-[560px]">
                    Imagen principal de la categoria
                  </div>
                )}
              </div>

              <section className="space-y-3">
                {(safeCategory.category_text || "El contenido principal de la categoria aparecera aqui.")
                  .split(/\n+/)
                  .filter((line) => line.trim().length > 0)
                  .map((line, index) => (
                    <p key={`text-${index}`} className="text-[17px] leading-8 text-[#2d3749]">
                      {line}
                    </p>
                  ))}
              </section>

              {safeCategory.category_section.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-[26px] font-semibold leading-tight text-[#1d3570]">
                    Sections
                  </h2>
                  <div className="space-y-4">
                    {safeCategory.category_section.map((section, index) => (
                      <div
                        key={`${section.section_title}-${index}`}
                        className="space-y-3 border-t border-[#d7d7d7] pt-4 first:border-t-0 first:pt-0"
                      >
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

              {safeCategory.category_camps.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-[26px] font-semibold leading-tight text-[#1d3570]">
                    Programs
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {safeCategory.category_camps.map((camp, index) => {
                      const linkedProgram = programMap.get(camp.program_id);

                      return (
                        <div
                          key={`${camp.program_id}-${index}`}
                          className="rounded-lg border border-[#d7d7d7] bg-[#f8f8f8] p-5"
                        >
                          <h3 className="text-[20px] font-semibold text-[#1d3570]">
                            {linkedProgram?.program_title || `Program ${index + 1}`}
                          </h3>
                          <p className="mt-2 text-[16px] leading-7 text-[#4a4a4a]">
                            {linkedProgram?.program_description || camp.program_id}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {safeCategory.category_videos.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-[26px] font-semibold leading-tight text-[#1d3570]">
                    Videos
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {safeCategory.category_videos.map((item, index) => {
                      const linkedVideo = videoMap.get(item.video_id);
                      const preview = linkedVideo ? getVideoPreview(linkedVideo.videoUrl) : null;

                      return (
                        <div key={`${item.video_id}-${index}`} className="space-y-3">
                          <div className="overflow-hidden rounded-lg bg-black">
                            {preview?.kind === "youtube" && (
                              <img
                                src={preview.thumbnailUrl}
                                alt={linkedVideo?.title || "Video"}
                                className="aspect-video w-full object-cover"
                              />
                            )}
                            {preview?.kind === "file" && (
                              <video
                                src={preview.sourceUrl}
                                className="aspect-video w-full bg-black"
                                controls
                                preload="metadata"
                              />
                            )}
                            {!preview && (
                              <div className="flex aspect-video items-center justify-center text-sm text-gray-400">
                                Preview
                              </div>
                            )}
                          </div>
                          <p className="text-[16px] font-semibold text-[#1d3570]">
                            {linkedVideo?.title || item.video_id}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {safeCategory.category_images.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-[26px] font-semibold leading-tight text-[#1d3570]">
                    Images
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {safeCategory.category_images.map((item, index) => {
                      const linkedImage = imageMap.get(item.image_id);
                      const previewUrl = resolveS3ImageUrl(linkedImage?.imageUrl ?? "");

                      return (
                        <div key={`${item.image_id}-${index}`} className="space-y-2">
                          <div className="overflow-hidden rounded-lg bg-[#d7d7d7]">
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                alt={linkedImage?.title || "Image"}
                                className="aspect-video w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.src = "/images/logo/ifx-logo.png";
                                }}
                              />
                            ) : (
                              <div className="flex aspect-video items-center justify-center text-sm text-gray-500">
                                Imagen
                              </div>
                            )}
                          </div>
                          <p className="text-[15px] font-medium text-[#1d3570]">
                            {linkedImage?.title || item.image_id}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </article>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={pickerModal.isOpen}
        onClose={pickerModal.closeModal}
        className="mx-4 max-w-6xl p-0"
      >
        <div className="max-h-[85vh] overflow-y-auto bg-white p-5 dark:bg-gray-900">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <Label htmlFor="picker-search">Buscar</Label>
              <Input
                id="picker-search"
                value={pickerSearch}
                onChange={(event) => setPickerSearch(event.target.value)}
                placeholder={`Buscar ${pickerTarget}`}
              />
            </div>
            <div className="lg:w-72">
              <Label htmlFor="picker-category">Categoria</Label>
              <select
                id="picker-category"
                value={pickerCategory}
                onChange={(event) => setPickerCategory(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                {(pickerTarget === "programs" ? programCategoryOptions : ["all"]).map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "All" : option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pickerItems.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No hay resultados para mostrar.
              </div>
            )}

            {pickerTarget === "programs" &&
              pickerItems.map((item) => {
                const program = item as Program;
                const previewUrl = resolveS3ImageUrl(
                  program.program_hero[0]?.image_url || program.program_section[0]?.section_image
                );

                return (
                  <button
                    key={program.program_id}
                    type="button"
                    className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:shadow-theme-xs dark:border-gray-800 dark:hover:border-brand-500"
                    onClick={() => onSelectPickerItem(program.program_id)}
                  >
                    <div className="mb-3 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={program.program_title}
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video items-center justify-center text-sm text-gray-400">
                          Sin imagen
                        </div>
                      )}
                    </div>
                    <p className="text-xs uppercase tracking-wide text-brand-500">
                      {program.program_category || "No category"}
                    </p>
                    <h4 className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
                      {program.program_title || program.program_id}
                    </h4>
                  </button>
                );
              })}

            {pickerTarget === "videos" &&
              pickerItems.map((item) => {
                const video = item as VideoItem;
                const preview = getVideoPreview(video.videoUrl);

                return (
                  <button
                    key={video.id}
                    type="button"
                    className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:shadow-theme-xs dark:border-gray-800 dark:hover:border-brand-500"
                    onClick={() => onSelectPickerItem(video.id)}
                  >
                    <div className="mb-3 overflow-hidden rounded-lg bg-black">
                      {preview?.kind === "youtube" && (
                        <img
                          src={preview.thumbnailUrl}
                          alt={video.title}
                          className="aspect-video w-full object-cover"
                        />
                      )}
                      {preview?.kind === "file" && (
                        <video
                          src={preview.sourceUrl}
                          className="aspect-video w-full bg-black"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )}
                      {!preview && (
                        <div className="flex aspect-video items-center justify-center text-sm text-gray-400">
                          Sin preview
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {video.title || video.id}
                    </h4>
                  </button>
                );
              })}

            {pickerTarget === "images" &&
              pickerItems.map((item) => {
                const image = item as ImageItem;
                const previewUrl = resolveS3ImageUrl(image.imageUrl);

                return (
                  <button
                    key={image.id}
                    type="button"
                    className="rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 hover:shadow-theme-xs dark:border-gray-800 dark:hover:border-brand-500"
                    onClick={() => onSelectPickerItem(image.id)}
                  >
                    <div className="mb-3 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={image.title}
                          className="aspect-video w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-video items-center justify-center text-sm text-gray-400">
                          Sin preview
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {image.title || image.id}
                    </h4>
                  </button>
                );
              })}
          </div>
        </div>
      </Modal>
    </>
  );
}
