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
import {
  Destination,
  createEmptyDestination,
  loadDestinations,
  removeDestination,
  upsertDestination,
} from "./destinationData";

export default function DestinationsList() {
  const navigate = useNavigate();
  const [data, setData] = useState<Destination[]>([]);
  const [newDestinationTitle, setNewDestinationTitle] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setData(loadDestinations());
  }, []);

  const onEdit = (id: string) => {
    navigate(`/destinations/${btoa(id)}`);
  };

  const onCreate = () => {
    navigate("/destinations/new");
  };

  const onDelete = (id: string) => {
    const confirmed = window.confirm("Deseas borrar este destino?");
    if (!confirmed) {
      return;
    }

    removeDestination(id);
    setData(loadDestinations());
  };

  const onQuickSave = () => {
    const title = newDestinationTitle.trim();
    if (!title) {
      setSaveMessage("Escribe un Destination Title antes de guardar.");
      return;
    }

    const destination = createEmptyDestination();
    destination.title = title;
    upsertDestination(destination);
    setData(loadDestinations());
    setNewDestinationTitle("");
    setSaveMessage("Destination guardado.");
  };

  return (
    <>
      <PageMeta title="Destinations List" description="Destinations List" />
      <PageBreadcrumb pageTitle="Destinations List" />
      <div className="space-y-6">
        <ComponentCard title="Destinations">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-[260px] flex-1">
              <label
                htmlFor="destination-title-quick-save"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Destination Title
              </label>
              <Input
                id="destination-title-quick-save"
                value={newDestinationTitle}
                onChange={(e) => {
                  setNewDestinationTitle(e.target.value);
                  setSaveMessage(null);
                }}
                placeholder="Write the Destination title"
              />
            </div>
            <Button onClick={onQuickSave}>Save Destination</Button>
          </div>
          {saveMessage && (
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{saveMessage}</p>
          )}
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

