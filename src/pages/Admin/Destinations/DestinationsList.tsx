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
import { fetchDestinations, normalizeEnabled } from "./destinationData";
import type { Destination } from "./destinationData";

export default function DestinationsList() {
  const navigate = useNavigate();
  const [data, setData] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    setError(null);

    try {
      const destinations = await fetchDestinations();
      setData(destinations);
    } catch {
      setData([]);
      setError("No se pudieron cargar los destinos del API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const onEdit = (id: string) => {
    navigate(`/destinations/${btoa(id)}`);
  };

  const onCreate = () => {
    navigate("/destinations/new");
  };

  return (
    <>
      <PageMeta title="Destinations List" description="Destinations List" />
      <PageBreadcrumb pageTitle="Destinations List" />
      <div className="space-y-6">
        <ComponentCard title="Destinations">
          <div className="mb-4 flex items-center justify-end">
            <Button onClick={onCreate}>New Destination</Button>
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
                      Category
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Date
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Enabled
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading && (
                    <TableRow>
                      <td
                        colSpan={6}
                        className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        Cargando destinos...
                      </td>
                    </TableRow>
                  )}

                  {!loading && error && (
                    <TableRow>
                      <td
                        colSpan={6}
                        className="px-5 py-6 text-center text-sm text-error-600 dark:text-error-400"
                      >
                        {error}
                      </td>
                    </TableRow>
                  )}

                  {!loading && !error && data.length === 0 && (
                    <TableRow>
                      <td
                        colSpan={6}
                        className="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No hay destinos para mostrar.
                      </td>
                    </TableRow>
                  )}

                  {!loading &&
                    !error &&
                    data.map((item) => {
                      const mainImage = resolveS3ImageUrl(
                        item.destination_hero[0]?.image_url ||
                          item.destination_section[0]?.section_image ||
                          item.destination_cities[0]?.city_image ||
                          item.destination_academies[0]?.academy_image
                      );
                      const enabled = normalizeEnabled(item.destination_state) === 1;

                      return (
                        <TableRow key={item.destination_id}>
                          <TableCell className="px-5 py-4">
                            {mainImage ? (
                              <div className="h-14 w-24 overflow-hidden rounded-md">
                                <img
                                  src={mainImage}
                                  alt={item.destination_title}
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
                            {item.destination_title}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            {item.destination_category}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {item.destination_date}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge size="sm" color={enabled ? "success" : "error"}>
                              {enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(item.destination_id)}
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
