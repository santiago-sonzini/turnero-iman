"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import { ProductWithCategory } from "@/app/actions/products";

interface ProcessedProduct extends ProductWithCategory {
    _dataUrl: string | null;
    _hasImg: boolean;
}

const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);

            const dataURL = canvas.toDataURL("image/png");
            resolve(dataURL);
        };
        img.src = url;
    });
};

export default function CatalogGenerator({ products }: { products: ProductWithCategory[] }) {
    const productsGas = products.filter((p) => p.catalog === "Gas");
    const productsSanitarios = products.filter((p) => p.catalog === "Sanitarios");
    const productsPerillas = products.filter((p) => p.catalog === "Perillas");
    const [showPrice, setShowPrice] = useState(true);
    const [showStock, setShowStock] = useState(false);
    const [onlyImg, setOnlyImg] = useState(false);
    const [onlyCatalog, setOnlyCatalog] = useState(true);

    const [progress, setProgress] = useState(0);
    const [generating, setGenerating] = useState(false);

    // Configuración de Estilos por Categoría (Extensible)
    const THEME: Record<string, { border: [number, number, number], bg: [number, number, number], text: [number, number, number] }> = {
        "Gas": { border: [200, 0, 0], bg: [255, 235, 235], text: [150, 0, 0] },
        "Sanitarios": { border: [0, 100, 200], bg: [235, 245, 255], text: [0, 70, 150] },
        "Perillas": { border: [130, 0, 200], bg: [245, 235, 255], text: [80, 0, 150] },
        "Default": { border: [100, 100, 100], bg: [242, 242, 242], text: [60, 60, 60] }
    };

    async function fetchImageAsDataURL(url?: string) {
        return new Promise<string | null>((resolve) => {
            if (!url) return resolve(null);
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) return resolve(null);
                ctx.drawImage(img, 0, 0);
                try {
                    resolve(canvas.toDataURL("image/jpeg", 0.7));
                } catch { resolve(null); }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    async function generatePDF(
        type: "Gas" | "Sanitarios" | "Perillas",
        sourceProducts: ProductWithCategory[]
    ) {
        setGenerating(true);
        setProgress(0);

        // 🔥 usar el array que viene por argumento
        let list = [...sourceProducts];

        // 🔥 si querés que solo muestre ese catálogo
        list = list.filter((p) => p.catalog === type);

        if (onlyCatalog) list = list.filter((p) => p.catalog);

        const processed: ProcessedProduct[] = [];

        // 1. Procesamiento de imágenes
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            const dataUrl = await fetchImageAsDataURL(p?.images?.[0]);

            if (p) {
                processed.push({ ...p, _dataUrl: dataUrl, _hasImg: !!dataUrl });
                setProgress((i / list.length) * 40);
            }
        }

        // 2. ORDENAMIENTO
        processed.sort((a, b) => {
            const catA = a.category || "";
            const catB = b.category || "";
            if (catA.localeCompare(catB) !== 0) return catA.localeCompare(catB);

            const typeA = a.catalog || "Z-Sin-Catalogo";
            const typeB = b.catalog || "Z-Sin-Catalogo";
            if (typeA.localeCompare(typeB) !== 0) return typeA.localeCompare(typeB);

            return a.name.localeCompare(b.name);
        });

        const final = onlyImg ? processed.filter(p => p._hasImg) : processed;

        const doc = new jsPDF();

        let y = 35;
        const margin = 15;
        const imgSize = 30;

        const logoBase64 = await loadImage("https://www.sanigas.store/favicon.png");

        const drawHeader = (pageNumber: number) => {
            const headerHeight = 20;
            const centerY = headerHeight / 2;

            // 🎯 colores por tipo
            let r = 100, g = 100, b = 100;

            switch (type) {
                case "Gas":
                    r = 200; g = 0; b = 0;
                    break;

                case "Sanitarios":
                    r = 0; g = 100; b = 200;
                    break;

                case "Perillas":
                    r = 130; g = 0; b = 200;
                    break;
            }

            // Fondo dinámico
            doc.setFillColor(r, g, b);
            doc.rect(0, 0, 210, headerHeight, "F");

            // Logo
            const logoHeight = 10;
            const logoY = centerY - logoHeight / 2;
            doc.addImage(logoBase64, "PNG", margin, logoY, 10, logoHeight);

            // Texto principal
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(255, 255, 255);

            const textOffset = 1.5;

            doc.text(
                `SANIGAS - ${type.toUpperCase()}`,
                margin + 14,
                centerY + textOffset
            );

            // Página
            doc.setFontSize(8);
            doc.text(
                `PÁGINA ${pageNumber} | ${new Date().toLocaleDateString()}`,
                210 - margin,
                centerY + textOffset,
                { align: "right" }
            );
        };

        drawHeader(1);

        final.forEach((p, i) => {
            if (y > 250) {
                doc.addPage();
                y = 35;
                drawHeader(doc.getNumberOfPages());
            }

            // 🎯 colores según TYPE (más coherente ahora)
            let br = 100, bg = 100, bb = 100;
            let bgr = 242, bgg = 242, bgb = 242;
            let tr = 60, tg = 60, tb = 60;

            switch (type) {
                case "Gas":
                    br = 200; bg = 0; bb = 0;
                    bgr = 255; bgg = 235; bgb = 235;
                    tr = 150; tg = 0; tb = 0;
                    break;

                case "Sanitarios":
                    br = 0; bg = 100; bb = 200;
                    bgr = 235; bgg = 245; bgb = 255;
                    tr = 0; tg = 70; tb = 150;
                    break;

                case "Perillas":
                    br = 130; bg = 0; bb = 200;
                    bgr = 245; bgg = 235; bgb = 255;
                    tr = 80; tg = 0; tb = 150;
                    break;
            }

            // imagen
            doc.setLineWidth(0.5);
            doc.setDrawColor(br, bg, bb);
            doc.rect(margin, y, imgSize, imgSize);

            if (p._dataUrl) {
                const imgProps = doc.getImageProperties(p._dataUrl);

                const ratio = Math.min(
                    (imgSize - 2) / imgProps.width,
                    (imgSize - 2) / imgProps.height
                );

                const newWidth = imgProps.width * ratio;
                const newHeight = imgProps.height * ratio;

                const xOffset = ((imgSize - 2) - newWidth) / 2;
                const yOffset = ((imgSize - 2) - newHeight) / 2;

                doc.addImage(
                    p._dataUrl,
                    "JPEG",
                    margin + 1 + xOffset,
                    y + 1 + yOffset,
                    newWidth,
                    newHeight
                );
            } else {
                doc.setFontSize(6);
                doc.setTextColor(180, 180, 180);
                doc.text("SIN IMAGEN", margin + 7, y + 15);
            }

            const contentX = margin + imgSize + 6;

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(p.name.toUpperCase(), contentX, y + 5);

            doc.text("#" + p.slug.toUpperCase(), contentX, y + 10);

            if (p.category) {
                const categoryLabel = p.category.toUpperCase();

                doc.setFontSize(7);
                const badgeW = doc.getTextWidth(categoryLabel) + 6;

                doc.setDrawColor(br, bg, bb);
                doc.setFillColor(bgr, bgg, bgb);
                doc.roundedRect(contentX, y + 18.5, badgeW, 5, 1, 1, "FD");

                doc.setTextColor(tr, tg, tb);
                doc.text(categoryLabel, contentX + 3, y + 21.5);
            }

            if (showPrice) {
                doc.setFontSize(14);
                doc.setTextColor(0, 0, 0);
                doc.text(`$${p.price.toLocaleString()}`, 195, y + 8, { align: "right" });
            }

            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.1);
            doc.line(margin, y + imgSize + 5, 195, y + imgSize + 5);

            y += imgSize + 10;
            setProgress(40 + ((i / final.length) * 60));
        });

        doc.save(`CATALOGO_${type}_${Date.now()}.pdf`);
        setGenerating(false);
        setProgress(100);
    }

    return (
        <div className="p-8 mt-12 max-w-2xl mx-auto bg-stone-50 border-[3px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <header className="border-b-4 border-black pb-4 mb-8">
                <h1 className="text-4xl font-black uppercase italic tracking-tighter text-black">
                    Panel <span className="text-red-600">Sanigas</span>
                </h1>
                <p className="font-mono text-xs mt-1 font-bold text-gray-500">SYSTEM v2.0 // GENERADOR DE CATÁLOGOS</p>
            </header>

            <div className="space-y-6">
                <section className="grid grid-cols-2 gap-6 bg-white p-4 border-2 border-black">
                    {[
                        { id: 'price', label: 'Mostrar Precios', state: showPrice, set: setShowPrice },
                        { id: 'stock', label: 'Mostrar Stock', state: showStock, set: setShowStock },
                        { id: 'img', label: 'Solo con Foto', state: onlyImg, set: setOnlyImg },
                        { id: 'cat', label: 'Solo Catálogo', state: onlyCatalog, set: setOnlyCatalog },
                    ].map((opt) => (
                        <label key={opt.id} className="group flex items-center gap-3 cursor-pointer select-none">
                            <div className={`w-6 h-6 border-2 border-black flex items-center justify-center transition-colors ${opt.state ? 'bg-black' : 'bg-white'}`}>
                                {opt.state && <div className="w-2 h-2 bg-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={opt.state} onChange={() => opt.set(!opt.state)} />
                            <span className="font-black text-sm uppercase group-hover:text-red-600 transition-colors">{opt.label}</span>
                        </label>
                    ))}
                </section>

                <div className="w-full grid grid-cols-3 gap-3">

                    {/* GAS */}
                    <button
                        onClick={() => generatePDF("Gas", productsGas)}
                        disabled={generating}
                        className={`py-5 text-lg font-black uppercase tracking-widest border-b-8 border-black active:border-b-0 active:translate-y-2 transition-all
        ${generating ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                    >
                        GAS
                    </button>

                    {/* SANITARIOS */}
                    <button
                        onClick={() => generatePDF("Sanitarios", productsSanitarios)}
                        disabled={generating}
                        className={`py-5 text-lg font-black uppercase tracking-widest border-b-8 border-black active:border-b-0 active:translate-y-2 transition-all
        ${generating ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    >
                        SANITARIOS
                    </button>

                    {/* PERILLAS */}
                    <button
                        onClick={() => generatePDF("Perillas", productsPerillas)}
                        disabled={generating}
                        className={`py-5 text-lg font-black uppercase tracking-widest border-b-8 border-black active:border-b-0 active:translate-y-2 transition-all
        ${generating ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                    >
                        PERILLAS
                    </button>

                </div>

                {generating && (
                    <div className="mt-4">
                        <div className="w-full bg-white border-2 border-black h-6 p-1">
                            <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}