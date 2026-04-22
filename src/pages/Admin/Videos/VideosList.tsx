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
import { VideoItem, loadVideos, moveVideo, removeVideo } from "./videoData";

export default function VideosList() {
  const navigate = useNavigate();
  const [data, setData] = useState<VideoItem[]>([]);

  const refreshData = () => {
    setData(loadVideos());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const onEdit = (id: string) => {
    navigate(`/videos/${btoa(id)}`);
  };

  const onCreate = () => {
    navigate("/videos/new");
  };

  const onDelete = (id: string) => {
    const confirmed = window.confirm("Deseas borrar este video?");
    if (!confirmed) {
      return;
    }

    removeVideo(id);
    refreshData();
  };

  const onMove = (id: string, direction: "up" | "down") => {
    moveVideo(id, direction);
    refreshData();
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
                  {data.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-5 py-4">
                        {item.videoUrl ? (
                          <div className="h-14 w-24 overflow-hidden rounded-md bg-black">
                            <video
                              src={item.videoUrl}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-24 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400 dark:bg-gray-800">
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMove(item.id, "up")}
                            disabled={index === 0}
                          >
                            Up
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMove(item.id, "down")}
                            disabled={index === data.length - 1}
                          >
                            Down
                          </Button>
                        </div>
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
                          <Button size="sm" onClick={() => onDelete(item.id)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
