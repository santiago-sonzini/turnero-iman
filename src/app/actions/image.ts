"use server"

import { createClient } from "@/db/server";
import { env } from "@/env";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
    fileName?: string;
}

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Sube imágenes/videos. Con Supabase configurado usa su storage; sin él
// (modo demo o deploy propio) guarda en public/uploads/ y sirve el archivo
// estático. OJO: la variante a disco requiere un server con filesystem
// persistente (no serverless) — igual que el servidor de WhatsApp.
export async function uploadMediaAction(
    formData: FormData
): Promise<UploadResult> {
    try {
        const file = formData.get("file") as File;
        const bucketName = (formData.get("bucketName") as string) || "products";
        const folderName = formData.get("folderName") as string;

        if (!file) {
            return { success: false, error: "No file provided" };
        }

        // Validar tipo de archivo
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (!isImage && !isVideo) {
            return { success: false, error: "Solo se permiten imágenes y videos" };
        }
        if (file.size > MAX_BYTES) {
            return { success: false, error: "El archivo supera los 8 MB" };
        }

        const extension = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = new Uint8Array(arrayBuffer);

        // ── Sin Supabase: guardar en public/uploads ──
        if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
            const fileName = `${crypto.randomUUID()}.${extension}`;
            const dir = path.join(process.cwd(), "public", "uploads");
            await mkdir(dir, { recursive: true });
            await writeFile(path.join(dir, fileName), fileBuffer);
            return { success: true, url: `/uploads/${fileName}`, fileName };
        }

        // ── Supabase storage ──
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 4);
        const fileName = `${timestamp}_${file.name}_${randomString}.${extension}`;
        const filePath = folderName ? `${folderName}/${fileName}` : fileName;

        const supabase = await createClient();

        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, fileBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return { success: false, error: uploadError.message };
        }

        const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        return {
            success: true,
            url: urlData.publicUrl,
            fileName: filePath,
        };
    } catch (error) {
        console.error("Server action error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Upload failed",
        };
    }
}
