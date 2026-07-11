"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Client } from "@prisma/client";
import { upsertClient } from "@/app/actions/clients";
import { LoadingSpinner } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ClientFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre es obligatorio." }),
  phone: z.string().min(1, { message: "El teléfono es obligatorio." }),
  email: z
    .string()
    .email({ message: "El email es inválido." })
    .optional()
    .or(z.literal("")),
  adress: z.string().optional(),
  notes: z.string().optional(),
  discount: z.coerce.number().min(0).max(100),
});

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (client: Client) => void;
  initialData?: Partial<Client>;
}

export function ClientForm({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: ClientFormProps) {
  const isEditing = !!initialData?.id;
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof ClientFormSchema>>({
    resolver: zodResolver(ClientFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      adress: initialData?.adress || "",
      notes: initialData?.notes || "",
      discount: initialData?.discount ?? 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        adress: initialData.adress || "",
        notes: initialData.notes || "",
        discount: initialData.discount ?? 0,
      });
    }
  }, [initialData, form]);

  const handleSubmit = useCallback(
    async (values: z.infer<typeof ClientFormSchema>) => {
      setLoading(true);
      const res = await upsertClient({
        id: isEditing ? initialData?.id : undefined,
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        adress: values.adress || undefined,
        notes: values.notes || undefined,
        discount: values.discount,
      });

      if (res.status !== 200 && res.status !== 201) {
        setLoading(false);
        throw new Error(res.message);
      }

      if (onSuccess) onSuccess(res.data);
      onOpenChange(false);
      setLoading(false);
    },
    [isEditing, initialData?.id, onSuccess, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Cliente" : "Agregar Cliente"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ejemplo@gmail.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+54 9 11 1234 5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle 123, Ciudad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Input placeholder="Notas internas del cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descuento (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <LoadingSpinner /> : isEditing ? "Actualizar Cliente" : "Agregar Cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}