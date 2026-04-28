import { useEffect, useState } from "react";
import Badge from "../../../components/ui/badge/Badge";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import ComponentCard from "../../../components/common/ComponentCard";
import PageMeta from "../../../components/common/PageMeta";
import { useNavigate } from "react-router-dom";
import { URL_API_BASE } from "../../../config/api";

import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import { resolveS3ImageUrl } from "../../../utils/s3Image";


interface Hero {
    id: number;
    title: string;
    button: string;
    call: string;
    enabled: number;
    image: string;
}


export default function HeroList() {

    const navigate = useNavigate();
    const onEdit = (id: number) => {
        navigate(`/hero/${btoa(id.toString())}`);
    };

    const [data, setData] = useState<Hero[]>([]);
    const [, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(URL_API_BASE);
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                const result: Hero[] = await response.json();
                const normalized = result.map((item) => ({
                    ...item,
                    image: resolveS3ImageUrl(item.image),
                }));
                setData(normalized);
                setLoading(false);
            } catch (err) {
                setError("Failed to fetch data");
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <>
            <PageMeta
                title="Hero List"
                description="Hero List"
            />
            <PageBreadcrumb pageTitle="Hero List" />
            <div className="space-y-6">
                <ComponentCard title="Hero">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
                        <div className="max-w-full overflow-x-auto">
                            <Table>
                                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                                    <TableRow>
                                        <TableCell isHeader className="px-5 py-3 text-start">Image</TableCell>
                                        <TableCell isHeader className="px-5 py-3 text-start">Title</TableCell>
                                        <TableCell isHeader className="px-5 py-3 text-start">Button</TableCell>
                                        <TableCell isHeader className="px-5 py-3 text-start">Status</TableCell>
                                        <TableCell isHeader className="px-5 py-3 text-start">Actions</TableCell>
                                    </TableRow>
                                </TableHeader>


                                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                    {data.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="px-5 py-4">
                                                <div className="w-10 h-10 overflow-hidden rounded-md">
                                                    <img
                                                        src={item.image}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-5 py-4">{item.title}</TableCell>
                                            <TableCell className="px-4 py-3">{item.button}</TableCell>
                                            <TableCell className="px-4 py-3">
                                                <Badge size="sm" color={item.enabled === 1 ? "success" : "error"}>
                                                    {item.enabled === 1 ? "Enabled" : "Disabled"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <button
                                                    onClick={() => onEdit(item.id)}
                                                    className="text-sm font-medium text-blue-600"
                                                >
                                                    Edit
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </ComponentCard>
            </div >
        </>
    );
}
