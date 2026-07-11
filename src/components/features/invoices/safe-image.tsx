"use client";

import Image from "next/image";
import { useState } from "react";
import { Package } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";

interface SafeImageProps {
    src: string | undefined;
    alt: string;
    className?: string;
    fill?: boolean;
    quality?: number;
}

export const SafeImageWithModal = ({
    src,
    alt,
    className,
    fill,
    quality,
}: SafeImageProps) => {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className={`flex items-center justify-center bg-white ${className}`}>
                <Package className="w-10 h-10 text-muted-foreground" />
            </div>
        );
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Image
                    src={src}
                    alt={alt}
                    className={`cursor-zoom-in ${className}`}
                    onError={() => setError(true)}
                    unoptimized
                    quality={quality ?? 30}
                    height={100}
                    width={100}
                    style={{
                        objectFit: "contain",
                        maxHeight: "100%",
                        maxWidth: "100%",
                        height: "auto",
                        width: "auto",
                    }}
                />
            </DialogTrigger>

            <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
                <div className="flex items-center justify-center w-full h-full">
                    <Image
                        src={src}
                        alt={alt}
                        unoptimized
                        quality={100}
                        width={1600}
                        height={1600}
                        className="object-contain max-h-[90vh] w-auto h-auto"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};