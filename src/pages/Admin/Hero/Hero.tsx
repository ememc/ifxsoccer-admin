import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import S3ImageManager from "../../../components/page/S3ImageManager";
import Button from "../../../components/ui/button/Button";
import { resolveS3ImageUrl } from "../../../utils/s3Image";
import {
  createEmptyHero,
  createHero as createHeroRequest,
  fetchHero,
  loadHeros,
  updateHero as updateHeroRequest,
} from "./heroData";
import type { HeroItem } from "./heroData";

export default function Hero() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [hero, setHero] = useState<HeroItem | null>(null);
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

  useEffect(() => {
    if (decodedId === "" || decodedId === "new") {
      setHero(createEmptyHero());
      setLoadError(decodedId === "" ? "Id invalido en la URL." : null);
      setLoading(false);
      return;
    }

    let isCurrent = true;

    const loadHero = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const found = await fetchHero(decodedId);

        if (!isCurrent) {
          return;
        }

        setHero(found);
      } catch {
        const fallback = loadHeros().find((item) => item.id === decodedId);

        if (!isCurrent) {
          return;
        }

        setHero(fallback ?? createEmptyHero(decodedId));
        setLoadError("No se pudo cargar el hero del API.");
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    void loadHero();

    return () => {
      isCurrent = false;
    };
  }, [decodedId]);

  const safeHero = hero ?? createEmptyHero();
  const previewImage = resolveS3ImageUrl(safeHero.image);

  const updateHero = (patch: Partial<HeroItem>) => {
    setHero({ ...safeHero, ...patch });
    setSaveMessage(null);
    setSaveError(null);
  };

  const onSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const isNewHero = decodedId === "new";
      const heroToSave = isNewHero ? safeHero : { ...safeHero, id: decodedId };
      const savedHero = isNewHero
        ? await createHeroRequest(heroToSave)
        : await updateHeroRequest(heroToSave);

      setHero(savedHero);
      setSaveMessage(
        isNewHero ? "Hero creado correctamente." : "Hero actualizado correctamente."
      );

      if (isNewHero) {
        navigate(`/heros/${btoa(savedHero.id)}`, { replace: true });
      }
    } catch (error) {
      const apiError = error instanceof Error ? ` ${error.message}` : "";
      setSaveError(
        decodedId === "new"
          ? `No se pudo crear el hero en el API.${apiError}`
          : `No se pudo actualizar el hero en el API.${apiError}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Hero" description="Hero editor" />
      <PageBreadcrumb pageTitle={decodedId === "new" ? "New Hero" : "Hero Detail"} />
      <div className="space-y-6">
        <ComponentCard
          title={decodedId === "new" ? "New Hero" : "Hero"}
          desc="Carga de hero con titulo, boton, imagen y fecha de publicacion."
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
                  Cargando hero...
                </p>
              )}
              {loadError && (
                <p className="text-sm text-error-600 dark:text-error-400">
                  {loadError}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/hero-list")}>
                Back to List
              </Button>
              <Button
                onClick={() => {
                  void onSave();
                }}
                disabled={loading || isSaving}
              >
                {isSaving ? "Saving..." : "Save Hero"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#3558a8] bg-[#f5f8ff] p-4 dark:border-[#4f6cb2] dark:bg-[#101a33]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#234487] dark:text-[#9fb5e8]">
                Main Hero Content
              </h3>
              <span className="rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
                Principal
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <Label htmlFor="hero-id">Id</Label>
                <Input id="hero-id" value={safeHero.id} disabled />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="hero-title">Titulo</Label>
                  <Input
                    id="hero-title"
                    value={safeHero.title}
                    onChange={(e) => updateHero({ title: e.target.value })}
                    placeholder="Titulo del hero"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={safeHero.enabled === 1 ? "primary" : "outline"}
                      onClick={() => updateHero({ enabled: 1 })}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={safeHero.enabled === 0 ? "primary" : "outline"}
                      onClick={() => updateHero({ enabled: 0 })}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="hero-button">Button Text</Label>
                  <Input
                    id="hero-button"
                    value={safeHero.button}
                    onChange={(e) => updateHero({ button: e.target.value })}
                    placeholder="Texto del boton"
                  />
                </div>
                <div>
                  <Label htmlFor="hero-call">Button Call To Action</Label>
                  <Input
                    id="hero-call"
                    value={safeHero.call}
                    onChange={(e) => updateHero({ call: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="hero-image">Image URL</Label>
                <Input
                  id="hero-image"
                  value={safeHero.image}
                  onChange={(e) => updateHero({ image: e.target.value })}
                  placeholder="https://.../image.jpg"
                />
              </div>

              {previewImage && (
                <div className="h-48 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-white/[0.08] dark:bg-gray-900">
                  <img
                    src={previewImage}
                    alt={safeHero.title || "Hero preview"}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = "/images/logo/ifx-logo.png";
                    }}
                  />
                </div>
              )}

              <div>
                <Label>Biblioteca S3 Hero</Label>
                <S3ImageManager
                  selectedUrl={safeHero.image}
                  onSelect={(url) => updateHero({ image: url })}
                />
              </div>

              <div>
                <Label htmlFor="hero-date">Fecha de Publicacion</Label>
                <Input
                  id="hero-date"
                  type="date"
                  value={safeHero.date}
                  onChange={(e) => updateHero({ date: e.target.value })}
                />
              </div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
