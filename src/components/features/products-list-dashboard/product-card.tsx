"use client";

import {
  ProductWithCategory,
  updateProductPartial,
} from "@/app/actions/products";

import { Package, X, Loader2, ChevronDown, Upload, Copy, Check, Image, Video } from "lucide-react";
import { SafeImage } from "./safe-image";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadMediaAction } from "@/app/actions/image";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProductCardProps {
  product: ProductWithCategory;
  viewMode: "grid" | "list";
  onEdit?: (product: ProductWithCategory) => void;
  // Selección tipo Excel (solo desktop): checkbox a la izquierda + arrastre.
  selectable?: boolean;
  selected?: boolean;
  onSelectDown?: (id: string, e: React.PointerEvent) => void;
  onSelectEnter?: (id: string) => void;
}

type EditableField = "name" | "price" | "cost" | "stock" | null;

interface EditingState {
  name: string;
  price: number;
  cost: number;
  stock: number;
}

// ─── Types for MediaUploader ───────────────────────────────────────────────

interface UploadedFile {
  name: string;
  url: string;
  type: "image" | "video";
}

interface InlineMediaUploaderProps {
  bucketName?: string;
  folderName?: string;
  onUpload?: (url: string) => void;
}

// ─── EditableText ──────────────────────────────────────────────────────────

function EditableText({
  value,
  field,
  activeField,
  onActivate,
  onChange,
  onCommit,
  onCancel,
  inputProps,
  displayClassName,
  children,
}: any) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = activeField === field;

  useEffect(() => {
    if (isActive) inputRef.current?.focus();
  }, [isActive]);

  if (isActive) {
    return (
      <Input
        ref={inputRef}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={onCommit}
        {...inputProps}
      />
    );
  }

  return (
    <span
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onActivate(field);
      }}
      className={cn("cursor-text select-none px-1", displayClassName)}
    >
      {children}
    </span>
  );
}

// ─── Inline MediaUploader (inside modal) ──────────────────────────────────

function InlineMediaUploader({
  bucketName = "products",
  folderName = "",
  onUpload,
}: InlineMediaUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => fileInputRef.current?.click();

  const handleFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({});
    setErrorMessages([]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i] as File;
      const fileId = `${file.name}-${i}`;

      try {
        setUploadProgress((prev) => ({ ...prev, [fileId]: true }));

        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucketName", bucketName);
        if (folderName.trim()) {
          formData.append("folderName", folderName.trim());
        }

        const result = await uploadMediaAction(formData);

        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });

        if (result && result.success && result.url) {
          const fileType = file.type.startsWith("image/") ? "image" : "video";
          setUploadedFiles((prev) => [
            ...prev,
            { name: result.fileName || file.name, url: result.url!, type: fileType },
          ]);
          // Notificar al padre con la última URL subida
          onUpload?.(result.url);
        } else {
          setErrorMessages((prev) => [
            ...prev,
            `Error subiendo ${file.name}: ${result.error}`,
          ]);
        }
      } catch (error) {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
        setErrorMessages((prev) => [
          ...prev,
          `Error subiendo ${file.name}: ${error instanceof Error ? error.message : "Error desconocido"}`,
        ]);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch { }
  };

  const removeFile = (index: number) =>
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

  const dismissError = (index: number) =>
    setErrorMessages((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="mt-4 border-t-2 border-black pt-4 space-y-3">
      <p className="text-xs font-black uppercase opacity-60 tracking-widest">
        Actualizar imagen
      </p>

      {/* Upload trigger */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFilesChange}
          disabled={isUploading}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleFileSelect}
          disabled={isUploading}
          className="border-2 border-black font-bold"
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? "Subiendo..." : "Seleccionar archivo"}
        </Button>
        <span className="text-xs text-gray-500">Imágenes y videos</span>
      </div>

      {/* Upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="bg-blue-50 border-2 border-black p-3 rounded space-y-1">
          {Object.keys(uploadProgress).map((fileId) => (
            <div key={fileId} className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600" />
              <span className="text-xs text-blue-700 font-bold">
                {fileId.split("-")[0]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errorMessages.map((error, index) => (
        <div
          key={index}
          className="bg-red-50 border-2 border-red-400 p-2 flex items-center justify-between rounded"
        >
          <span className="text-red-700 text-xs font-bold">{error}</span>
          <button onClick={() => dismissError(index)}>
            <X className="w-3 h-3 text-red-500" />
          </button>
        </div>
      ))}

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="bg-gray-50 border-2 border-black p-2 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {file.type === "image" ? (
                  <Image className="w-4 h-4 text-blue-500 shrink-0" />
                ) : (
                  <Video className="w-4 h-4 text-purple-500 shrink-0" />
                )}
                <div className="flex-1 max-w-[200px] min-w-0">
                  <p className="text-xs font-black truncate">{file.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{file.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copyToClipboard(file.url)}
                  className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                  title="Copiar URL"
                >
                  {copiedUrl === file.url ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                  title="Eliminar"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ProductCard ───────────────────────────────────────────────────────────

export const ProductCard = ({
  product,
  viewMode,
  onEdit,
  selectable = false,
  selected = false,
  onSelectDown,
  onSelectEnter,
}: ProductCardProps) => {
  const [activeField, setActiveField] = useState<EditableField>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // URL de imagen pendiente de confirmar
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);

  const [editValues, setEditValues] = useState<EditingState>({
    name: product.name,
    price: product.price,
    cost:
      product.cost && product.cost > 0
        ? product.cost
        : product.price / 1.5,
    stock: product.stock,

  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Limpiar imagen pendiente al cerrar el modal
  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setPendingImageUrl(null);
      setSaveError(null);
    }
  };

  const activate = (field: EditableField) => {
    setActiveField(field);
    setSaveError(null);
  };

  const commit = async () => {
    setActiveField(null);
    setIsSaving(true);

    try {
      const res = await updateProductPartial({
        id: product.id,
        name: editValues.name,
        price: String(editValues.price),
        stock: String(editValues.stock),
        cost: String(editValues.cost),
        ...(pendingImageUrl ? { images: [pendingImageUrl] } : {}),

      });

      if (res.status === 200 && res.data) {
        onEdit?.({ ...product, ...editValues });
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const cancel = () => {
    setActiveField(null);
    setEditValues({
      name: product.name,
      price: product.price,
      cost: product.cost ?? 0,
      stock: product.stock,
    });
  };

  const handleChange =
    (field: keyof EditingState) => (val: string) => {
      setEditValues((prev) => ({
        ...prev,
        [field]:
          field === "name"
            ? val
            : field === "stock"
              ? parseInt(val) || 0
              : parseFloat(val) || 0,
      }));
    };

  // ── Confirmar actualización de imagen + campos editados ──────────────────
  const handleConfirmImageUpdate = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const payload: any = {
        id: product.id,
        name: editValues.name,
        price: String(editValues.price),
        stock: String(editValues.stock),
        cost: String(editValues.cost),
      };

      // Solo incluir imagen si hay una pendiente
      if (pendingImageUrl) {
        payload.images = [pendingImageUrl];
      }

      const res = await updateProductPartial(payload);

      if (res.status === 200 && res.data) {
        const updatedProduct: ProductWithCategory = {
          ...product,
          ...editValues,
          ...(pendingImageUrl ? { images: [pendingImageUrl] } : {}),
        };
        onEdit?.(updatedProduct);
        setPendingImageUrl(null);
        setIsModalOpen(false);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const margin =
    editValues.cost > 0
      ? (
        ((editValues.price - editValues.cost) / editValues.price) *
        100
      ).toFixed(1)
      : null;

  const fieldProps = (field: EditableField) => ({
    field,
    activeField,
    onActivate: activate,
    onCommit: commit,
    onCancel: cancel,
  });

  const marginBadge = margin ? (
    <span
      className={cn(
        "inline-block min-w-[56px] border-2 border-black px-2 py-1 text-xs font-black text-center",
        parseFloat(margin) >= 40
          ? "bg-green-500 text-white"
          : parseFloat(margin) >= 20
            ? "bg-yellow-400 text-black"
            : "bg-red-500 text-white"
      )}
    >
      {margin}%
    </span>
  ) : (
    "—"
  );

  // Notion-style soft badge (used by the compact desktop list).
  const notionBadge = (value: string | null) =>
    value ? (
      <span
        className={cn(
          "inline-block rounded px-1.5 py-0.5 text-xs font-medium tabular-nums",
          parseFloat(value) >= 40
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            : parseFloat(value) >= 20
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
        )}
      >
        {value}%
      </span>
    ) : (
      <span className="text-neutral-300">—</span>
    );

  // Imagen activa: pendiente (recién subida) o la del producto
  const activeImageSrc = pendingImageUrl ?? product.images?.[0];

  return (
    <>
      {/* ─── DESKTOP (≥ lg) — Notion-style compact row ─── */}
      <div className="group hidden lg:block">
        <div
          onPointerEnter={() => selectable && onSelectEnter?.(product.id)}
          className={cn(
            "grid items-center gap-3",
            selectable
              ? "grid-cols-[30px_34px_1fr_92px_92px_72px_88px]"
              : "grid-cols-[34px_1fr_92px_92px_72px_88px]",
            "border-b border-neutral-100 px-3 py-1.5 text-sm text-neutral-800 transition-colors",
            "dark:border-neutral-800 dark:text-neutral-200",
            selected
              ? "bg-acento-suave"
              : activeField
                ? "bg-blue-50/60 dark:bg-blue-950/20"
                : "hover:bg-neutral-50 dark:hover:bg-neutral-900/40",
            isSaving && "opacity-60",
            saveError && "bg-rose-50 dark:bg-rose-950/20"
          )}
        >
          {/* SELECT */}
          {selectable && (
            <div
              className="flex cursor-pointer items-center justify-center"
              onPointerDown={(e) => onSelectDown?.(product.id, e)}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                  selected
                    ? "border-acento bg-acento text-white"
                    : "border-neutral-300 dark:border-neutral-600",
                )}
              >
                {selected && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </div>
          )}

          {/* IMAGE */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white transition hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {product.images?.[0] ? (
              <SafeImage
                src={product.images[0]}
                alt={product.name}
                className="object-contain"
                fill
              />
            ) : (
              <Package className="size-4 text-neutral-400" />
            )}
          </div>

          {/* NAME */}
          <div className="min-w-0">
            <EditableText
              value={editValues.name}
              onChange={handleChange("name")}
              {...fieldProps("name")}
              inputProps={{
                className: "w-full rounded-md border border-neutral-300 px-1.5 py-0.5 text-sm",
              }}
              displayClassName="block truncate font-medium"
            >
              {editValues.name}{" "}
              <span className="text-neutral-400">#{product.slug}</span>
            </EditableText>
            <span className="text-xs text-neutral-400">{product.category}</span>
            {saveError && (
              <span className="flex items-center gap-1 text-xs text-rose-600">
                <X className="size-3" />
                {saveError}
              </span>
            )}
          </div>

          {/* COST */}
          <div className="text-right tabular-nums text-neutral-500">
            <EditableText
              value={editValues.cost}
              onChange={handleChange("cost")}
              {...fieldProps("cost")}
              inputProps={{
                type: "number",
                className: "w-20 rounded-md border border-neutral-300 px-1.5 py-0.5 text-right text-sm",
              }}
            >
              ${editValues.cost.toFixed(0)}
            </EditableText>
          </div>

          {/* PRICE */}
          <div className="text-right font-semibold tabular-nums">
            <EditableText
              value={editValues.price}
              onChange={handleChange("price")}
              {...fieldProps("price")}
              inputProps={{
                type: "number",
                className: "w-20 rounded-md border border-neutral-300 px-1.5 py-0.5 text-right text-sm",
              }}
            >
              ${editValues.price.toFixed(0)}
            </EditableText>
          </div>

          {/* MARGIN */}
          <div className="flex justify-end">{notionBadge(margin)}</div>

          {/* STOCK */}
          <div className="flex items-center justify-end text-right tabular-nums">
            {isSaving ? (
              <Loader2 className="size-4 animate-spin text-neutral-400" />
            ) : (
              <EditableText
                value={editValues.stock}
                onChange={handleChange("stock")}
                {...fieldProps("stock")}
                inputProps={{
                  type: "number",
                  className: "w-16 rounded-md border border-neutral-300 px-1.5 py-0.5 text-right text-sm",
                }}
              >
                {editValues.stock}
              </EditableText>
            )}
          </div>
        </div>
      </div>

      {/* ─── TABLET (sm → lg) ─── */}
      <div className="group hidden sm:block lg:hidden">
        <div
          className={cn(
            "border-b-2 border-black bg-background",
            activeField ? "bg-slate-100" : "",
            isSaving && "opacity-60",
            saveError && "bg-red-100"
          )}
        >
          <div className="grid grid-cols-[48px_1fr_90px_70px] items-center gap-2 px-3 py-2">
            <div
              onClick={() => setIsModalOpen(true)}
              className="flex h-12 w-12 cursor-pointer items-center justify-center border-2 border-black bg-white hover:scale-105 transition overflow-hidden"
            >
              {product.images?.[0] ? (
                <SafeImage
                  src={product.images[0]}
                  alt={product.name}
                  className="h-12 w-12 object-contain"
                  quality={80}
                />
              ) : (
                <Package className="size-4" />
              )}
            </div>

            <div className="min-w-0 border-l-2 border-black pl-3">
              <EditableText
                value={editValues.name}
                onChange={handleChange("name")}
                {...fieldProps("name")}
                inputProps={{
                  className:
                    "w-full border-2 border-black px-2 py-1 text-sm font-bold",
                }}
                displayClassName="block truncate text-sm font-black uppercase"
              >
                {editValues.name} #{product.slug}
              </EditableText>
              <span className="text-xs font-bold opacity-70">
                {product.category}
              </span>
              {saveError && (
                <span className="text-xs flex items-center gap-1 text-red-600">
                  <X className="size-3" />
                  {saveError}
                </span>
              )}
            </div>

            <div className="border-l-2 border-black pl-2 text-right font-black text-sm">
              <EditableText
                value={editValues.price}
                onChange={handleChange("price")}
                {...fieldProps("price")}
                inputProps={{
                  type: "number",
                  className:
                    "w-16 border-2 border-black px-1 py-1 text-right text-sm",
                }}
              >
                ${editValues.price.toFixed(0)}
              </EditableText>
            </div>

            <div className="flex flex-col items-end gap-1 border-l-2 border-black pl-2">
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                marginBadge
              )}
              <button
                onClick={() => setIsExpanded((v) => !v)}
                className="flex items-center gap-0.5 text-xs font-bold opacity-60 hover:opacity-100"
              >
                <ChevronDown
                  className={cn(
                    "size-3 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="grid grid-cols-2 gap-2 border-t-2 border-black px-3 py-2 text-sm">
              <div>
                <p className="text-xs font-bold uppercase opacity-60">Costo</p>
                <EditableText
                  value={editValues.cost}
                  onChange={handleChange("cost")}
                  {...fieldProps("cost")}
                  inputProps={{
                    type: "number",
                    className:
                      "w-20 border-2 border-black px-2 py-1 text-right text-sm",
                  }}
                  displayClassName="font-bold"
                >
                  ${editValues.cost.toFixed(0)}
                </EditableText>
              </div>
              <div>
                <p className="text-xs font-bold uppercase opacity-60">Stock</p>
                <EditableText
                  value={editValues.stock}
                  onChange={handleChange("stock")}
                  {...fieldProps("stock")}
                  inputProps={{
                    type: "number",
                    className:
                      "w-20 border-2 border-black px-2 py-1 text-right text-sm",
                  }}
                  displayClassName="font-bold"
                >
                  {editValues.stock}
                </EditableText>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── MOBILE (< sm) ─── */}
      <div className="block sm:hidden">
        <div
          className={cn(
            "border-b-2 border-black bg-background",
            isSaving && "opacity-60",
            saveError && "bg-red-100"
          )}
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <div
              onClick={() => setIsModalOpen(true)}
              className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center border-2 border-black bg-white"
            >
              {product.images?.[0] ? (
                <SafeImage
                  src={product.images[0]}
                  alt={product.name}
                  className="object-contain"
                  fill
                />
              ) : (
                <Package className="size-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <EditableText
                value={editValues.name}
                onChange={handleChange("name")}
                {...fieldProps("name")}
                inputProps={{
                  className:
                    "w-full border-2 border-black px-2 py-1 text-sm font-bold",
                }}
                displayClassName="block truncate text-sm font-black uppercase"
              >
                {editValues.name} #{product.slug}
              </EditableText>
              <span className="text-xs font-bold opacity-70">
                {product.category}
              </span>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                marginBadge
              )}
              <button
                onClick={() => setIsExpanded((v) => !v)}
                className="flex items-center gap-0.5 text-xs font-bold opacity-50 hover:opacity-100"
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>
            </div>
          </div>

          {saveError && (
            <div className="px-3 pb-2 text-xs flex items-center gap-1 text-red-600 font-bold">
              <X className="size-3" />
              {saveError}
            </div>
          )}

          {isExpanded && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t-2 border-black px-3 py-3 text-sm">
              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-0.5">
                  Costo
                </p>
                <EditableText
                  value={editValues.cost}
                  onChange={handleChange("cost")}
                  {...fieldProps("cost")}
                  inputProps={{
                    type: "number",
                    className:
                      "w-full border-2 border-black px-2 py-1 text-right",
                  }}
                  displayClassName="font-bold"
                >
                  ${editValues.cost.toFixed(0)}
                </EditableText>
              </div>

              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-0.5">
                  Precio
                </p>
                <EditableText
                  value={editValues.price}
                  onChange={handleChange("price")}
                  {...fieldProps("price")}
                  inputProps={{
                    type: "number",
                    className:
                      "w-full border-2 border-black px-2 py-1 text-right",
                  }}
                  displayClassName="font-bold"
                >
                  ${editValues.price.toFixed(0)}
                </EditableText>
              </div>

              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-0.5">
                  Stock
                </p>
                <EditableText
                  value={editValues.stock}
                  onChange={handleChange("stock")}
                  {...fieldProps("stock")}
                  inputProps={{
                    type: "number",
                    className:
                      "w-full border-2 border-black px-2 py-1 text-right",
                  }}
                  displayClassName="font-bold"
                >
                  {editValues.stock}
                </EditableText>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODAL ─── */}
      <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="border-4 border-black max-w-xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="font-black uppercase text-lg">
              <EditableText
                value={editValues.name}
                onChange={handleChange("name")}
                {...fieldProps("name")}
                inputProps={{
                  className: "w-full border-2 border-black px-2 py-1 font-bold text-base",
                }}
                displayClassName="block font-black uppercase"
              >
                {editValues.name}
              </EditableText>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product image — muestra pendiente si existe */}
            <div className="relative flex h-[40vh] items-center justify-center border-2 border-black bg-white overflow-hidden">
              {activeImageSrc ? (
                <SafeImage
                  src={activeImageSrc}
                  alt={product.name}
                  className="object-contain"
                  fill
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="size-10" />
                </div>
              )}

              {/* Badge de imagen pendiente */}
              {pendingImageUrl && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-1 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Nueva imagen
                </div>
              )}
            </div>

            {/* Stats editables en el modal */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-bold">
              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-0.5">Costo</p>
                <EditableText
                  value={editValues.cost}
                  onChange={handleChange("cost")}
                  {...fieldProps("cost")}
                  inputProps={{
                    type: "number",
                    className: "w-full border-2 border-black px-2 py-1 text-right",
                  }}
                  displayClassName="font-bold"
                >
                  ${editValues.cost.toFixed(0)}
                </EditableText>
              </div>

              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-0.5">Precio</p>
                <EditableText
                  value={editValues.price}
                  onChange={handleChange("price")}
                  {...fieldProps("price")}
                  inputProps={{
                    type: "number",
                    className: "w-full border-2 border-black px-2 py-1 text-right",
                  }}
                  displayClassName="font-bold"
                >
                  ${editValues.price.toFixed(0)}
                </EditableText>
              </div>

              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-0.5">Margen</p>
                <p className="font-bold">{margin ?? "—"}%</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-0.5">Stock</p>
                <EditableText
                  value={editValues.stock}
                  onChange={handleChange("stock")}
                  {...fieldProps("stock")}
                  inputProps={{
                    type: "number",
                    className: "w-full border-2 border-black px-2 py-1 text-right",
                  }}
                  displayClassName="font-bold"
                >
                  {editValues.stock}
                </EditableText>
              </div>
            </div>

            {/* Media uploader */}
            <InlineMediaUploader
              bucketName="products"
              folderName={product.slug ?? ""}
              onUpload={(url) => setPendingImageUrl(url)}
            />

            {/* Error */}
            {saveError && (
              <div className="bg-red-50 border-2 border-red-400 p-2 flex items-center gap-2 text-xs font-bold text-red-700">
                <X className="w-3 h-3 shrink-0" />
                {saveError}
              </div>
            )}

            {/* Confirm button */}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleConfirmImageUpdate}
                disabled={isSaving}
                className="border-2 border-black font-black uppercase tracking-wider"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Confirmar actualización"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};