"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { upsertProducts } from "@/app/actions/products";

import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";

const CATALOG_OPTIONS = [
    { label: "Baño", value: "bathroom" },
    { label: "Cocina", value: "kitchen" },
    { label: "Accesorios", value: "accessories" },
];

export function ImportProductsModal() {
    const [open, setOpen] = useState(false);
    const [json, setJson] = useState("");
    const [category, setCategory] = useState("");
    const [catalog, setCatalog] = useState("");
    const [loading, setLoading] = useState(false);

    const handleImport = async () => {
        try {
            setLoading(true);

            const parsed = JSON.parse(json);

            const withCategory = parsed.map((p: any) => ({
                ...p,
                category,
                catalog,
            }));

            await upsertProducts(withCategory);

            setJson("");
            setCategory("");
            setCatalog("");
            setOpen(false);
        } catch (err) {
            console.error(err);
            alert("JSON inválido");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-9 border-2 border-black bg-black px-4 text-xs font-black uppercase text-white hover:bg-[#e8503a]"
                >
                    <Plus className="mr-2 size-3" />

                    IMPORTAR
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Importar productos</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Categoría</Label>
                        <Input
                            placeholder="Ej: Polipropileno"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Catálogo</Label>

                        <Select value={catalog} onValueChange={setCatalog}>
                            <SelectTrigger
                                className={
                                    "w-full border-2 border-black rounded-none bg-white dark:bg-black dark:text-white " +
                                    "font-black uppercase tracking-widest text-sm h-10 " +
                                    "focus:ring-0 focus:ring-offset-0 focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-shadow " +
                                    "[&>span]:truncate"
                                }
                            >
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>

                            <SelectContent className="border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-0">
                                <SelectItem value="ALL">TODOS</SelectItem>
                                <SelectItem value="Gas">GAS</SelectItem>
                                <SelectItem value="Sanitarios">SANITARIOS</SelectItem>
                                <SelectItem value="Perillas">PERILLAS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>JSON</Label>
                        <Textarea
                            placeholder="Pegar JSON acá..."
                            className="min-h-[300px] font-mono text-xs"
                            value={json}
                            onChange={(e) => setJson(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleImport}
                        disabled={loading || !json || !category || !catalog}
                    >
                        {loading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Importar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}