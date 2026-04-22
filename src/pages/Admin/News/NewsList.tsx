import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../components/ui/badge/Badge";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import PageMeta from "../../../components/common/PageMeta";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { News, createEmptyNews, loadNews, removeNews, upsertNews } from "./newsData";

export default function NewsList() {
  const navigate = useNavigate();
  const [data, setData] = useState<News[]>([]);
  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setData(loadNews());
  }, []);

  const onEdit = (id: string) => {
    navigate(`/news/${btoa(id)}`);
  };

  const onCreate = () => {
    navigate("/news/new");
  };

  const onDelete = (id: string) => {
    const confirmed = window.confirm("Deseas borrar esta noticia?");
    if (!confirmed) {
      return;
    }

    removeNews(id);
    setData(loadNews());
  };

  const onQuickSave = () => {
    const title = newNewsTitle.trim();
    if (!title) {
      setSaveMessage("Escribe un News Title antes de guardar.");
      return;
    }

    const newsItem = createEmptyNews();
    newsItem.title = title;
    upsertNews(newsItem);
    setData(loadNews());
    setNewNewsTitle("");
    setSaveMessage("Noticia guardada.");
  };

  return (
    <>
      <PageMeta title="News List" description="News List" />
      <PageBreadcrumb pageTitle="News List" />
      <div className="space-y-6">
        <ComponentCard title="News">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-[260px] flex-1">
              <label
                htmlFor="news-title-quick-save"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                News Title
              </label>
              <Input
                id="news-title-quick-save"
                value={newNewsTitle}
                onChange={(e) => {
                  setNewNewsTitle(e.target.value);
                  setSaveMessage(null);
                }}
                placeholder="Write the news title"
              />
            </div>
            <Button onClick={onQuickSave}>Save News</Button>
          </div>
          {saveMessage && (
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{saveMessage}</p>
          )}
          <div className="mb-4 flex items-center justify-end">
            <Button onClick={onCreate}>New News</Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Image
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Title
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Status
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-5 py-4">
                        {item.image ? (
                          <div className="h-10 w-10 overflow-hidden rounded-md">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400 dark:bg-gray-800">
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
