import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import S3ImageManager from "../../../components/page/S3ImageManager";
import Button from "../../../components/ui/button/Button";
import { createEmptyImage, fetchImageById, saveImage } from "./imageData";
import type { ImageItem } from "./imageData";

export default function Image() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [imageItem, setImageItem] = useState<ImageItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (decodedId === "") {
      setError("Id invalido en la URL.");
      setLoading(false);
      return;
    }

    if (decodedId === "new") {
      setImageItem(createEmptyImage());
      setError(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const found = await fetchImageById(decodedId);
        if (!found) {
          setError("No se encontro la imagen en el API.");
          setImageItem(createEmptyImage());
          return;
        }

        setImageItem(found);
      } catch {
        setError("No se pudo cargar la imagen desde el API.");
        setImageItem(createEmptyImage());
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [decodedId]);

  const safeImage = imageItem ?? createEmptyImage();
  const isNewImage = decodedId === "new";

  const updateImage = (patch: Partial<ImageItem>) => {
    setImageItem({ ...safeImage, ...patch });
    setSaveMessage(null);
    setSaveError(null);
  };

  const onSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      await saveImage(safeImage, isNewImage ? "create" : "edit");
      setSaveMessage(
        isNewImage ? "Imagen creada correctamente." : "Imagen actualizada correctamente."
      );

      if (isNewImage) {
        navigate(`/images/${btoa(safeImage.id)}`, { replace: true });
      }
    } catch {
      setSaveError("No se pudo guardar la imagen en el API.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Image" description="Image editor" />
      <PageBreadcrumb pageTitle={isNewImage ? "New Image" : "Image Detail"} />
      <div className="space-y-6">
        <ComponentCard
          title={isNewImage ? "New Image" : "Image"}
          desc="Carga de imagen con titulo y fecha de publicacion."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {loading && <p className="text-sm text-gray-500">Cargando imagen...</p>}
              {error && <p className="text-sm text-error-600">{error}</p>}
              {saveMessage && (
                <p className="text-sm text-success-600 dark:text-success-400">{saveMessage}</p>
              )}
              {saveError && <p className="text-sm text-error-600">{saveError}</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/images-list")}>
                Back to List
              </Button>
              <Button onClick={() => void onSave()} disabled={loading || isSaving}>
                {isSaving ? "Saving..." : "Save Image"}
              </Button>
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
                  <Label htmlFor="image-id">Id</Label>
                  <Input id="image-id" value={safeImage.id} disabled />
                </div>
                <div>
                  <Label htmlFor="image-title">Titulo</Label>
                  <Input
                    id="image-title"
                    value={safeImage.title}
                    onChange={(e) => updateImage({ title: e.target.value })}
                    placeholder="Titulo de la imagen"
                  />
                </div>
                <div className="lg:col-start-2">
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
