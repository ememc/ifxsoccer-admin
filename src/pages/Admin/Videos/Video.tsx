import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import DatePicker from "../../../components/form/date-picker";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import { VideoIcon } from "../../../icons";
import { getVideoPreview } from "../../../utils/videoPreview";
import {
  createEmptyVideo,
  createVideo as createVideoRequest,
  fetchVideo,
  loadVideos,
  updateVideo as updateVideoRequest,
} from "./videoData";
import type { VideoItem } from "./videoData";

export default function Video() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [video, setVideo] = useState<VideoItem | null>(null);
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
      setVideo(createEmptyVideo());
      setLoadError(null);
      setLoading(false);
      return;
    }

    let isCurrent = true;

    const loadVideo = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const found = await fetchVideo(decodedId);

        if (!isCurrent) {
          return;
        }

        setVideo(found);
      } catch {
        const fallback = loadVideos().find((item) => item.id === decodedId);

        if (!isCurrent) {
          return;
        }

        setVideo(fallback ?? createEmptyVideo(decodedId));
        setLoadError("No se pudo cargar el video del API.");
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    void loadVideo();

    return () => {
      isCurrent = false;
    };
  }, [decodedId]);

  const safeVideo = video ?? createEmptyVideo();
  const videoPreview = useMemo(() => getVideoPreview(safeVideo.videoUrl), [safeVideo.videoUrl]);

  const updateVideo = (patch: Partial<VideoItem>) => {
    setVideo({ ...safeVideo, ...patch });
    setSaveMessage(null);
    setSaveError(null);
  };

  const onSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const isNewVideo = decodedId === "new";
      const videoToSave = isNewVideo ? safeVideo : { ...safeVideo, id: decodedId };
      const savedVideo = isNewVideo
        ? await createVideoRequest(videoToSave)
        : await updateVideoRequest(videoToSave);

      setVideo(savedVideo);
      setSaveMessage(
        isNewVideo ? "Video creado correctamente." : "Video actualizado correctamente."
      );

      if (isNewVideo) {
        navigate(`/videos/${btoa(savedVideo.id)}`, { replace: true });
      }
    } catch (error) {
      const apiError = error instanceof Error ? ` ${error.message}` : "";
      setSaveError(
        decodedId === "new"
          ? `No se pudo crear el video en el API.${apiError}`
          : `No se pudo actualizar el video en el API.${apiError}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Video" description="Video editor" />
      <PageBreadcrumb pageTitle={decodedId === "new" ? "New Video" : "Video Detail"} />
      <div className="space-y-6">
        <ComponentCard
          title={decodedId === "new" ? "New Video" : "Video"}
          desc="Carga de video con titulo y fecha de publicacion."
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
                  Cargando video...
                </p>
              )}
              {loadError && (
                <p className="text-sm text-error-600 dark:text-error-400">
                  {loadError}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/videos-list")}>
                Back to List
              </Button>
              <Button
                onClick={() => {
                  void onSave();
                }}
                disabled={loading || isSaving}
              >
                {isSaving ? "Saving..." : "Save Video"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#3558a8] bg-[#f5f8ff] p-4 dark:border-[#4f6cb2] dark:bg-[#101a33]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#234487] dark:text-[#9fb5e8]">
                Main Video Content
              </h3>
              <span className="rounded-md bg-[#dce6fb] px-2 py-1 text-xs font-semibold text-[#234487] dark:bg-[#1a2b54] dark:text-[#b6c7ef]">
                Principal
              </span>
            </div>

            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="video-title">Titulo</Label>
                  <Input
                    id="video-title"
                    value={safeVideo.title}
                    onChange={(e) => updateVideo({ title: e.target.value })}
                    placeholder="Titulo del video"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={safeVideo.enabled === 1 ? "primary" : "outline"}
                      onClick={() => updateVideo({ enabled: 1 })}
                    >
                      Enabled
                    </Button>
                    <Button
                      variant={safeVideo.enabled === 0 ? "primary" : "outline"}
                      onClick={() => updateVideo({ enabled: 0 })}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="video-url">Video URL</Label>
                <Input
                  id="video-url"
                  value={safeVideo.videoUrl}
                  onChange={(e) => updateVideo({ videoUrl: e.target.value })}
                  placeholder="https://.../video.mp4"
                />
              </div>

              <div>
                <Label>Preview</Label>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-white/[0.08]">
                  {videoPreview?.kind === "youtube" && (
                    <iframe
                      src={videoPreview.embedUrl}
                      title={safeVideo.title || "Video preview"}
                      className="aspect-video w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  )}

                  {videoPreview?.kind === "file" && (
                    <video
                      src={videoPreview.sourceUrl}
                      className="aspect-video w-full bg-black"
                      controls
                      preload="metadata"
                    />
                  )}

                  {!videoPreview && (
                    <div className="flex aspect-video w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500">
                      <VideoIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <Label htmlFor="video-alt">Alt Text</Label>
                  <Input
                    id="video-alt"
                    value={safeVideo.alt ?? ""}
                    onChange={(e) => updateVideo({ alt: e.target.value })}
                    placeholder="Texto alternativo del video"
                  />
                </div>
                <div>
                  <Label htmlFor="video-order">Order</Label>
                  <Input
                    id="video-order"
                    type="number"
                    value={safeVideo.order ?? ""}
                    onChange={(e) => {
                      const order = e.target.value === "" ? undefined : Number(e.target.value);
                      updateVideo({ order: Number.isFinite(order) ? order : undefined });
                    }}
                    placeholder="Orden"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="video-published-at">Fecha de Publicacion</Label>
                <DatePicker
                  id="video-published-at"
                  value={safeVideo.publishedAt}
                  onDateChange={(publishedAt) => updateVideo({ publishedAt })}
                />
              </div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
