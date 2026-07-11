"use client"
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Droplet, Settings, MessageCircle, Tag, Zap } from "lucide-react";
import { getAllActiveOffersAction } from "../actions/offers";
import { Offer } from "@prisma/client";

type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";
type OfferScope = "GLOBAL" | "PRODUCTS" | "CATEGORY";

const SCOPE_LABEL: Record<OfferScope, string> = {
  GLOBAL: "Toda la tienda",
  PRODUCTS: "Productos seleccionados",
  CATEGORY: "Categoría",
};

const SCOPE_COLOR: Record<OfferScope, string> = {
  GLOBAL: "bg-black text-white",
  PRODUCTS: "bg-[#de1520] text-white",
  CATEGORY: "bg-[#50545a] text-white",
};

function formatDiscount(type: DiscountType, value: number) {
  if (type === "PERCENTAGE") return `-${value}%`;
  return `-$${value.toLocaleString("es-AR")}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function getOfferWhatsappLink(phone: string, offerName: string) {
  const message = encodeURIComponent(`Hola! Quiero saber más sobre esta oferta: ${offerName}`);
  return `https://wa.me/${phone}?text=${message}`;
}

export default function Sanigas() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const PHONE = "5493534267164";
  const whatsappLink = `https://wa.me/${PHONE}`;

  const categories = [
    {
      icon: <Flame size={28} />,
      color: "text-[#de1520]",
      accent: "bg-[#de1520]",
      label: "Repuestos Gas",
      sub: "Termocuplas, válvulas, quemadores",
      href: "/productos/lista/gas",
    },
    {
      icon: <Droplet size={28} />,
      color: "text-blue-600",
      accent: "bg-blue-600",
      label: "Sanitarios",
      sub: "Mecanismos, griferías, duchas",
      href: "/productos/lista/sanitarios",
    },
    {
      icon: <Settings size={28} />,
      color: "text-[#50545a]",
      accent: "bg-[#50545a]",
      label: "Perillas",
      sub: "Sets multi-marca, universal",
      href: "/productos/lista/perillas",
    },
  ];

  useEffect(() => {
    const load = async () => {
      const offers = await getAllActiveOffersAction();
      setOffers(offers);
    };
    load();
  }, []);

  return (
<div className=" bg-white font-sans text-slate-900">
      {/* TOP BAR */}
      <div className="flex justify-between bg-black px-4 py-2 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">
        <Link target="_blank" href="https://maps.app.goo.gl/jQDb8BmbvE1nyyjw6">
          La Rioja 2332, Villa María
        </Link>
        <span>Lun–Vie 09:00 a 19:00</span>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b-[3px] border-[#de1520] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" className="h-10 w-10 border-2 border-black" alt="logo" />
            <div>
              <h1 className="text-2xl font-black italic leading-none tracking-tight">
                <span className="text-[#50545a]">SANI</span>
                <span className="text-[#de1520]">GAS</span>
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Repuestos gas & sanitarios
              </p>
            </div>
          </div>
          <Link
            href={whatsappLink}
            target="_blank"
            className="flex items-center gap-2 bg-green-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-black transition-colors"
          >
            <MessageCircle size={14} />
            Consultar
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full min-h-[68vh] mx-auto max-w-7xl px-4 py-8 flex flex-col">

        {/* CATEGORY CARDS */}
        <section>
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
            Categorías
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group relative flex items-center gap-5 border-2 border-slate-200 bg-white p-6 hover:border-[#de1520] transition-colors"
              >
                <div className={`absolute left-0 top-0 h-full w-1 ${cat.accent}`} />
                <span className={`${cat.color} transition-transform group-hover:scale-110`}>
                  {cat.icon}
                </span>
                <div>
                  <h3 className="text-base font-black uppercase italic leading-tight">
                    {cat.label}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">{cat.sub}</p>
                </div>
                <span className="ml-auto text-xl text-slate-200 group-hover:text-[#de1520] transition-colors">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* OFFERS */}
        <section>
          <div className="mb-5 flex items-center gap-3 border-b-2 border-black pb-3">
            <Tag className="text-[#de1520]" size={20} />
            <h2 className="text-3xl font-black uppercase italic tracking-tight">Ofertas</h2>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {offers.length} activas
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer) => (
              <Link
                key={offer.id}
                href={getOfferWhatsappLink(PHONE, offer.name)}
                target="_blank"
                className="group relative flex flex-col border-2 border-slate-200 bg-white hover:border-[#de1520] transition-colors overflow-hidden"
              >
                {/* Image */}
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  {offer.imageUrl ? (
                    <img
                      src={offer.imageUrl}
                      alt={offer.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <Zap size={40} />
                    </div>
                  )}
                  {/* Discount badge */}
                  <div className="absolute right-0 top-0 bg-[#de1520] px-3 py-1.5 text-lg font-black italic text-white">
                    {formatDiscount(offer.discountType, offer.discountValue)}
                  </div>
                  {/* Scope badge */}
                  <div className={`absolute bottom-0 left-0 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${SCOPE_COLOR[offer.scope]}`}>
                    {SCOPE_LABEL[offer.scope]}
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-base font-black uppercase italic leading-tight">
                    {offer.name}
                  </h3>
                  {offer.description && (
                    <p className="mt-1 text-xs text-slate-500">{offer.description}</p>
                  )}
                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">
                      Hasta {formatDate(offer.endDate)}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#de1520] group-hover:underline">
                      Consultar →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* CTA STRIP */}
      <section className=" bg-black py-8 text-center">
        <Link
          href={whatsappLink}
          target="_blank"
          className="inline-flex items-center gap-4 bg-[#de1520] px-10 py-5 text-xl font-black uppercase italic text-white hover:bg-white hover:text-black transition-colors"
        >
          <MessageCircle size={22} />
          Contactar por WhatsApp
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="border-t-4 border-[#de1520] bg-black px-4 py-8 text-center text-xs font-semibold text-slate-500">
        <p className="text-white font-black uppercase tracking-widest">SANIGAS · VILLA MARÍA</p>
        <p className="mt-2">Repuestos para gas y sanitarios · Asesoramiento técnico</p>
      </footer>
    </div>
  );
}