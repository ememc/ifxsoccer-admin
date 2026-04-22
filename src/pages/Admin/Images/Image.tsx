import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import S3ImageManager from "../../../components/page/S3ImageManager";
import Button from "../../../components/ui/button/Button";
import { createEmptyImage, loadImages, upsertImage } from "./imageData";
import type { ImageItem } from "./imageData";

export default function Image() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [imageItem, setImageItem] = useState<ImageItem | null>(null);
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
      setImageItem(createEmptyImage());
      return;
    }

    const found = loadImages().find((item) => item.id === decodedId);
    setImageItem(found ?? createEmptyImage());
  }, [decodedId]);

  const safeImage = imageItem ?? createEmptyImage();

  const updateImage = (patch: Partial<ImageItem>) => {
    setImageItem({ ...safeImage, ...patch });
    setSaveMessage(null);
  };

  const onSave = () => {
    upsertImage(safeImage);
    setSaveMessage("Imagen guardada localmente.");

    if (decodedId === "new") {
      navigate(`/images/${btoa(safeImage.id)}`, { replace: true });
    }
  };

  return (
    <>
      <PageMeta title="Image" description="Image editor" />
      <PageBreadcrumb pageTitle={decodedId === "new" ? "New Image" : "Image Detail"} />
      <div className="space-y-6">
        <ComponentCard
          title={decodedId === "new" ? "New Image" : "Image"}
          desc="Carga de imagen con titulo y fecha de publicacion."
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
              <Button variant="outline" onClick={() => navigate("/images-list")}>
                Back to List
              </Button>
              <Button onClick={onSave}>Save Image</Button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#3558a8] bg-[#f5f8ff] p-4 dark:border-[#4f6cb2] dark:bg-[#101a33]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#234487] dark:text-[#9fb5e8]">
                Main Image Content
              </h3>
              <span className="rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
                Principal
              </span>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="image-title">Titulo</Label>
                  <Input
                    id="image-title"
                    value={safeImage.title}
                    onChange={(e) => updateImage({ title: e.target.value })}
                    placeholder="Titulo de la imagen"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={safeImage.enabled === 1 ? "primary" : "outline"}
                      onClick={() => updateImage({ enabled: 1 })}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={safeImage.enabled === 0 ? "primary" : "outline"}
                      onClick={() => updateImage({ enabled: 0 })}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  value={safeImage.imageUrl}
                  onChange={(e) => updateImage({ imageUrl: e.target.value })}
                  placeholder="https://.../image.jpg"
                />
              </div>

              <div>
                <Label>Biblioteca S3 Imagen</Label>
                <S3ImageManager
                  selectedUrl={safeImage.imageUrl}
                  onSelect={(url) => updateImage({ imageUrl: url })}
                />
              </div>

              <div>
                <Label htmlFor="image-published-at">Fecha de Publicacion</Label>
                <Input
                  id="image-published-at"
                  type="date"
                  value={safeImage.publishedAt}
                  onChange={(e) => updateImage({ publishedAt: e.target.value })}
                />
              </div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
