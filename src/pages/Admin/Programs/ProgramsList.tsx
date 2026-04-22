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
import { Program, loadPrograms, removeProgram } from "./programData";

export default function ProgramsList() {
  const navigate = useNavigate();
  const [data, setData] = useState<Program[]>([]);

  useEffect(() => {
    setData(loadPrograms());
  }, []);

  const onEdit = (id: string) => {
    navigate(`/programs/${btoa(id)}`);
  };

  const onCreate = () => {
    navigate("/programs/new");
  };

  const onDelete = (id: string) => {
    const confirmed = window.confirm("Deseas borrar este programa?");
    if (!confirmed) {
      return;
    }

    removeProgram(id);
    setData(loadPrograms());
  };

  return (
    <>
      <PageMeta title="Programs List" description="Programs List" />
      <PageBreadcrumb pageTitle="Programs List" />
      <div className="space-y-6">
        <ComponentCard title="Programs">
          <div className="flex items-center justify-end">
            <Button onClick={onCreate}>New Program</Button>
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
                      Edit
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-5 py-4">
                        {item.mainImage ? (
                          <div className="h-10 w-10 overflow-hidden rounded-md">
                            <img
                              src={item.mainImage}
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
