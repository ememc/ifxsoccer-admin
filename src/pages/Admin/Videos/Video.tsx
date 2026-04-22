import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import { createEmptyVideo, loadVideos, upsertVideo } from "./videoData";
import type { VideoItem } from "./videoData";

export default function Video() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [video, setVideo] = useState<VideoItem | null>(null);
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
      setVideo(createEmptyVideo());
      return;
    }

    const found = loadVideos().find((item) => item.id === decodedId);
    setVideo(found ?? createEmptyVideo());
  }, [decodedId]);

  const safeVideo = video ?? createEmptyVideo();

  const updateVideo = (patch: Partial<VideoItem>) => {
    setVideo({ ...safeVideo, ...patch });
    setSaveMessage(null);
  };

  const onSave = () => {
    upsertVideo(safeVideo);
    setSaveMessage("Video guardado localmente.");

    if (decodedId === "new") {
      navigate(`/videos/${btoa(safeVideo.id)}`, { replace: true });
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
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/videos-list")}>
                Back to List
              </Button>
              <Button onClick={onSave}>Save Video</Button>
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
                <Label htmlFor="video-published-at">Fecha de Publicacion</Label>
                <Input
                  id="video-published-at"
                  type="date"
                  value={safeVideo.publishedAt}
                  onChange={(e) => updateVideo({ publishedAt: e.target.value })}
                />
              </div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
