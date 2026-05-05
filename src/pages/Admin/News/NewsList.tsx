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
import { fetchNews, getNewsDisplayTitle, getNewsPlainText } from "./newsData";
import type { News } from "./newsData";

const truncateText = (value: string, maxLength = 120) =>
  value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;

export default function NewsList() {
  const navigate = useNavigate();
  const [data, setData] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    setError(null);

    try {
      const news = await fetchNews();
      setData(news);
    } catch {
      setData([]);
      setError("No se pudieron cargar las noticias del API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const onEdit = (id: string) => {
    navigate(`/news/${btoa(id)}`);
  };

  const onCreate = () => {
    navigate("/news/new");
  };

  return (
    <>
      <PageMeta title="News List" description="News List" />
      <PageBreadcrumb pageTitle="News List" />
      <div className="space-y-6">
        <ComponentCard title="News">
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
                      Content
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Category
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Date
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      State
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
                  {loading && (
                    <TableRow>
                      <td colSpan={7} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Cargando noticias...
                      </td>
                    </TableRow>
                  )}

                  {!loading && error && (
                    <TableRow>
                      <td colSpan={7} className="px-5 py-6 text-center text-sm text-error-600 dark:text-error-400">
                        {error}
                      </td>
                    </TableRow>
                  )}

                  {!loading && !error && data.length === 0 && (
                    <TableRow>
                      <td colSpan={7} className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        No hay noticias para mostrar.
                      </td>
                    </TableRow>
                  )}

                  {!loading && !error && data.map((item) => {
                    const title = getNewsDisplayTitle(item);
                    const plainText = getNewsPlainText(item.text);
                    const excerpt = plainText && plainText !== title ? plainText : item.tags;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="px-5 py-4">
                          {item.image ? (
                            <div className="h-14 w-24 overflow-hidden rounded-md">
                              <img
                                src={item.image}
                                alt={title}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.src = "/images/logo/ifx-logo.png";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="flex h-14 w-24 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400 dark:bg-gray-800">
                              N/A
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          <div className="max-w-[360px]">
                            <p className="font-medium text-gray-800 dark:text-white/90">
                              {truncateText(title, 80)}
                            </p>
                            {excerpt && (
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {truncateText(excerpt)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4">
                          {item.category || "N/A"}
                        </TableCell>
                        <TableCell className="px-5 py-4">{item.date || "N/A"}</TableCell>
                        <TableCell className="px-5 py-4">
                          <Badge size="sm" color={item.state ? "info" : "light"}>
                            {item.state || "N/A"}
                          </Badge>
                        </TableCell>
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
