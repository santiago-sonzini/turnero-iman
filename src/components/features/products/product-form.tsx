"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product } from "@prisma/client";
import { useToast } from "@/components/ui/use-toast";
import { createProduct, updateProduct } from "@/app/actions/products";
import { LoadingSpinner } from "@/components/ui/loading";

export const ProductFormSchema = z.object({
  id: z.string().optional(),
  images: z.array(z.string()).optional(),
  name: z.string().min(2, { message: "El nombre del producto debe tener al menos 2 caracteres." }),
  slug: z.string().min(2, { message: "El slug debe tener al menos 2 caracteres." }),
  category: z.string().min(1, { message: "Por favor, ingresa una categoría." }),
  catalog: z.string().min(1, { message: "Por favor, selecciona un catálogo." }),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "El precio debe ser un número positivo.",
  }),
  stock: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "El stock debe ser un número no negativo.",
  }),
  estimatedDurationDays: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Debe ser un número positivo.",
    }),
  unit: z.string().optional(),
  unitQuantity: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Debe ser un número positivo.",
    }),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  cost: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "El costo debe ser un número positivo.",
  }),
});

type ProductFormValues = z.infer<typeof ProductFormSchema>;

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (product: Product) => void;
  initialData?: Partial<Product> & { catalog?: string };
}

const CATALOG_OPTIONS = [
  { value: "perillas", label: "Perillas" },
  { value: "gas", label: "Gas" },
  { value: "sanitarios", label: "Sanitarios" },
  { value: "otros", label: "Otros" },
];

/* ── shared brutalist input classes ── */
const inputCls =
  "w-full border-2 border-black rounded-none bg-white dark:bg-black dark:text-white font-bold " +
  "placeholder:font-normal placeholder:opacity-40 focus-visible:ring-0 focus-visible:ring-offset-0 " +
  "focus-visible:border-black focus-visible:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-shadow";

const labelCls = "block text-xs font-black uppercase tracking-widest mb-1";
const errorCls = "text-red-600 text-xs font-bold mt-0.5 min-h-[1rem]";

export function ProductForm({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: ProductFormProps) {
  const { toast } = useToast();
  const isEditing = !!initialData?.id;
  const [loading, setLoading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: {
      id: initialData?.id || "",
      name: initialData?.name || "",
      slug: initialData?.slug || "",
      category: "",
      catalog: initialData?.catalog || "",
      price: initialData?.price?.toString() || "",
      stock: initialData?.stock?.toString() || "0",
      estimatedDurationDays: initialData?.estimatedDurationDays?.toString() || "",
      unit: initialData?.unit || "",
      unitQuantity: initialData?.unitQuantity?.toString() || "",
      isActive: initialData?.isActive ?? true,
      isFeatured: initialData?.isFeatured ?? false,
      cost: initialData?.cost?.toString() || "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData.id || undefined,
        name: initialData.name || "",
        slug: initialData.slug || "",
        category: "",
        catalog: initialData.catalog || "",
        price: initialData.price?.toString() || "",
        stock: initialData.stock?.toString() || "0",
        estimatedDurationDays: initialData.estimatedDurationDays?.toString() || "",
        unit: initialData.unit || "",
        unitQuantity: initialData.unitQuantity?.toString() || "",
        isActive: initialData.isActive ?? true,
        isFeatured: initialData.isFeatured ?? false,
        cost: initialData.cost?.toString() || "",
      });
    } else {
      form.reset({
        name: "", slug: "", category: "", catalog: "",
        price: "", stock: "0", estimatedDurationDays: "",
        unit: "", unitQuantity: "",
        isActive: true, isFeatured: false, cost: "",
      });
    }
  }, [initialData]);

  const onSubmit = async (data: ProductFormValues) => {
    setLoading(true);
    try {
      const res = isEditing ? await updateProduct(data) : await createProduct(data);
      if (res.status !== 200) throw new Error(res.message);
      onOpenChange(false);
      if (onSuccess) onSuccess(res.data);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Ocurrió un error al guardar el producto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[60vw] border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-0">
        {/* ── Header ── */}
        <DialogHeader className="border-b-4 border-black px-6 py-4 bg-black">
          <DialogTitle className="text-white font-black uppercase tracking-widest text-base">
            {isEditing ? "✎ Editar producto" : "+ Agregar producto"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="px-6 py-4 space-y-4 overflow-y-auto max-h-[75vh]"
        >
          {/* ── 2-col grid: Nombre + Slug ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre</label>
              <Input className={inputCls} {...form.register("name")} placeholder="Nombre del producto" />
              <p className={errorCls}>{form.formState.errors.name?.message}</p>
            </div>
            <div>
              <label className={labelCls}>Slug</label>
              <Input className={inputCls} {...form.register("slug")} placeholder="slug-del-producto" />
              <p className={errorCls}>{form.formState.errors.slug?.message}</p>
            </div>
          </div>

          {/* ── 2-col grid: Categoría + Catálogo ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Categoría</label>
              <Input className={inputCls} {...form.register("category")} placeholder="Ej: Ferretería" />
              <p className={errorCls}>{form.formState.errors.category?.message}</p>
            </div>

            <div>
              <label className={labelCls}>Catálogo</label>
              <Select
                onValueChange={(value) => form.setValue("catalog", value, { shouldValidate: true })}
                defaultValue={form.getValues("catalog")}
                value={form.watch("catalog")}
              >
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
                  {CATALOG_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className={
                        "font-black uppercase tracking-widest text-sm rounded-none px-4 py-2 " +
                        "cursor-pointer border-b border-black last:border-b-0 " +
                        "focus:bg-black focus:text-white data-[highlighted]:bg-black data-[highlighted]:text-white " +
                        "data-[state=checked]:bg-black data-[state=checked]:text-white"
                      }
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className={errorCls}>{form.formState.errors.catalog?.message}</p>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t-2 border-black border-dashed" />

          {/* ── 2-col grid: Precio + Costo ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Precio</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm opacity-50">$</span>
                <Input
                  className={inputCls + " pl-7"}
                  type="number"
                  step="0.01"
                  {...form.register("price")}
                  placeholder="0.00"
                />
              </div>
              <p className={errorCls}>{form.formState.errors.price?.message}</p>
            </div>
            <div>
              <label className={labelCls}>Costo</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-sm opacity-50">$</span>
                <Input
                  className={inputCls + " pl-7"}
                  type="number"
                  step="0.01"
                  {...form.register("cost")}
                  placeholder="0.00"
                />
              </div>
              <p className={errorCls}>{form.formState.errors.cost?.message}</p>
            </div>
          </div>

          {/* ── 3-col grid: Stock + Duración + Cantidad por unidad ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Stock</label>
              <Input className={inputCls} type="number" {...form.register("stock")} placeholder="0" />
              <p className={errorCls}>{form.formState.errors.stock?.message}</p>
            </div>
            <div>
              <label className={labelCls}>Duración (días)</label>
              <Input className={inputCls} type="number" {...form.register("estimatedDurationDays")} placeholder="30" />
              <p className={errorCls}>{form.formState.errors.estimatedDurationDays?.message}</p>
            </div>
            <div>
              <label className={labelCls}>Cant. por unidad</label>
              <Input className={inputCls} type="number" {...form.register("unitQuantity")} placeholder="15" />
              <p className={errorCls}>{form.formState.errors.unitQuantity?.message}</p>
            </div>
          </div>

          {/* ── Unidad ── */}
          <div>
            <label className={labelCls}>Unidad</label>
            <Input className={inputCls} {...form.register("unit")} placeholder="kg, ml, unidades..." />
            <p className={errorCls}>{form.formState.errors.unit?.message}</p>
          </div>

          {/* ── Divider ── */}
          <div className="border-t-2 border-black border-dashed" />

          {/* ── Checkboxes ── */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="border-2 border-black p-0.5 group-hover:bg-black transition-colors">
                <Checkbox
                  {...form.register("isActive")}
                  className="rounded-none border-0 data-[state=checked]:bg-black data-[state=checked]:text-white h-4 w-4"
                />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Activo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="border-2 border-black p-0.5 group-hover:bg-black transition-colors">
                <Checkbox
                  {...form.register("isFeatured")}
                  className="rounded-none border-0 data-[state=checked]:bg-black data-[state=checked]:text-white h-4 w-4"
                />
              </div>
              <span className="text-xs font-black uppercase tracking-widest">Destacado</span>
            </label>
          </div>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3 pt-2 border-t-4 border-black mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-none border-2 border-black font-black uppercase tracking-widest text-xs px-5 hover:bg-black hover:text-white transition-colors"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-none border-2 border-black bg-black text-white font-black uppercase tracking-widest text-xs px-5 hover:bg-white hover:text-black transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
            >
              {loading ? (
                <LoadingSpinner />
              ) : isEditing ? (
                "Actualizar"
              ) : (
                "Agregar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}