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
import { resolveS3ImageUrl } from "../../../utils/s3Image";
import { fetchApiHeros } from "./heroData";
import type { ApiHeroItem } from "./heroData";

const isHeroEnabled = (value: ApiHeroItem["hero_enabled"]) =>
  value === 1 ||
  value === true ||
  value === "1" ||
  String(value).toLowerCase() === "true";

export default function HeroList() {
  const navigate = useNavigate();
  const [data, setData] = useState<ApiHeroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    setError(null);

    try {
      const heros = await fetchApiHeros();
      setData(heros);
    } catch {
      setData([]);
      setError("No se pudieron cargar los heros del API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const onEdit = (id: string) => {
    navigate(`/heros/${btoa(id)}`);
  };

  const onCreate = () => {
    navigate("/heros/new");
  };

  return (
    <>
      <PageMeta title="Hero List" description="Hero List" />
      <PageBreadcrumb pageTitle="Hero List" />
      <div className="space-y-6">
        <ComponentCard title="Hero">
          <div className="mb-4 flex items-center justify-end">
            <Button onClick={onCreate}>New Hero</Button>
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
                      Button
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Call
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Date
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
                        Cargando heros...
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
                        No hay heros para mostrar.
                      </td>
                    </TableRow>
                  )}

                  {!loading && !error && data.map((item) => {
                    const imageUrl = resolveS3ImageUrl(item.hero_image);
                    const enabled = isHeroEnabled(item.hero_enabled);

                    return (
                      <TableRow key={item.hero_id}>
                        <TableCell className="px-5 py-4">
                          {imageUrl ? (
                            <div className="h-14 w-24 overflow-hidden rounded-md">
                              <img
                                src={imageUrl}
                                alt={item.hero_title}
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
                        <TableCell className="px-5 py-4">{item.hero_title}</TableCell>
                        <TableCell className="px-4 py-3">{item.hero_button}</TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="block max-w-xs truncate text-sm text-gray-600 dark:text-gray-300">
                            {item.hero_call}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {item.hero_date}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge
                            size="sm"
                            color={enabled ? "success" : "error"}
                          >
                            {enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEdit(item.hero_id)}
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
