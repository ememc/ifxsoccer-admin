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
import { fetchMenus, normalizeEnabled } from "./menuData";
import type { MenuItem } from "./menuData";

const getSectionsCount = (menu: MenuItem) =>
  menu.menu_header.reduce((total, header) => total + header.menu_section.length, 0);

const getDetailsCount = (menu: MenuItem) =>
  menu.menu_header.reduce(
    (total, header) =>
      total +
      header.menu_section.reduce((sectionTotal, section) => sectionTotal + section.menu_detail.length, 0),
    0
  );

export default function MenuList() {
  const navigate = useNavigate();
  const [data, setData] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    setError(null);

    try {
      const menus = await fetchMenus();
      setData(menus);
    } catch {
      setData([]);
      setError("No se pudieron cargar los menus del API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const onEdit = (id: string) => {
    navigate(`/menu/${btoa(id)}`);
  };

  const onCreate = () => {
    navigate("/menu/new");
  };

  return (
    <>
      <PageMeta title="Menu List" description="Menu List" />
      <PageBreadcrumb pageTitle="Menu List" />
      <div className="space-y-6">
        <ComponentCard title="Menu">
          <div className="mb-4 flex items-center justify-end">
            <Button onClick={onCreate}>New Menu</Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Main Header
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Headers
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Sections
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start">
                      Details
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
                        Cargando menus...
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
                        No hay menus para mostrar.
                      </td>
                    </TableRow>
                  )}

                  {!loading &&
                    !error &&
                    data.map((item) => {
                      const firstHeader = item.menu_header[0];
                      const enabledHeaders = item.menu_header.filter(
                        (header) => normalizeEnabled(header.header_enabled) === 1
                      ).length;

                      return (
                        <TableRow key={item.menu_id}>
                          <TableCell className="px-5 py-4">
                            {firstHeader?.header_text || "Untitled header"}
                          </TableCell>
                          <TableCell className="px-4 py-3">{item.menu_header.length}</TableCell>
                          <TableCell className="px-4 py-3">{getSectionsCount(item)}</TableCell>
                          <TableCell className="px-4 py-3">{getDetailsCount(item)}</TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge
                              size="sm"
                              color={enabledHeaders > 0 ? "success" : "error"}
                            >
                              {enabledHeaders > 0
                                ? `${enabledHeaders} Enabled`
                                : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(item.menu_id)}
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
