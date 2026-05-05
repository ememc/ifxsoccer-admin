import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../components/ui/badge/Badge";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { VideoIcon } from "../../../icons";
import { getVideoPreview } from "../../../utils/videoPreview";
import { fetchVideos } from "./videoData";
import type { VideoItem } from "./videoData";

export default function VideosList() {
  const navigate = useNavigate();
  const [data, setData] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    setError(null);

    try {
      const videos = await fetchVideos();
      setData(videos);
    } catch {
      setData([]);
      setError("No se pudieron cargar los videos del API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const onEdit = (id: string) => {
    navigate(`/videos/${btoa(id)}`);
  };

  const onCreate = () => {
    navigate("/videos/new");
  };

  return (
    <>
      <PageMeta title="Videos List" description="Videos List" />
      <PageBreadcrumb pageTitle="Videos List" />
      <div className="space-y-6">
        <ComponentCard title="Videos">
          <div className="mb-4 flex items-center justify-end">
            <Button onClick={onCreate}>New Video</Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Preview
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Title
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Status
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Order
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading && (
                    <TableRow>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Cargando videos...
                      </td>
                    </TableRow>
                  )}

                  {!loading && error && (
                    <TableRow>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm text-error-600 dark:text-error-400">
                        {error}
                      </td>
                    </TableRow>
                  )}

                  {!loading && !error && data.length === 0 && (
                    <TableRow>
                      <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No hay videos para mostrar.
                      </td>
                    </TableRow>
                  )}

                  {!loading && !error && data.map((item, index) => {
                    const preview = getVideoPreview(item.videoUrl);

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="px-5 py-4">
                          {preview?.kind === "youtube" && (
                            <div className="relative h-16 w-28 overflow-hidden rounded-md bg-black">
                              <img
                                src={preview.thumbnailUrl}
                                alt={item.alt || item.title}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.src = "/images/logo/ifx-logo.png";
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-600 shadow-theme-xs dark:bg-gray-900/90 dark:text-brand-300">
                                  <VideoIcon className="h-4 w-4" />
                                </span>
                              </div>
                            </div>
                          )}

                          {preview?.kind === "file" && (
                            <div className="relative h-16 w-28 overflow-hidden rounded-md bg-black">
                              <video
                                src={preview.sourceUrl}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brand-600 shadow-theme-xs dark:bg-gray-900/90 dark:text-brand-300">
                                  <VideoIcon className="h-4 w-4" />
                                </span>
                              </div>
                            </div>
                          )}

                          {!preview && (
                            <div className="flex h-16 w-28 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400 dark:bg-gray-800">
                              N/A
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-4">{item.title}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge
                            size="sm"
                            color={item.enabled === 1 ? "success" : "error"}
                          >
                            {item.enabled === 1 ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {item.order ?? index + 1}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(item.id)}
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
