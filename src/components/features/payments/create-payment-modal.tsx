"use client";

// Side panel para registrar un pago. La lógica vive en el PaymentCard
// compartido (create-payment-card.tsx); acá solo se define el trigger + Sheet.
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Client } from "@prisma/client";
import PaymentCard from "./create-payment-card";

export default function PaymentSidePanel({
  client,
  update,
  triggerType = "button",
}: {
  client: Client;
  update: () => void;
  triggerType?: "button" | "action";
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {triggerType === "button" ? (
          <button className="group relative overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 text-left shadow-sm transition-all hover:scale-105 hover:shadow-md">
            <div className="absolute right-4 top-4 text-4xl opacity-10 transition-opacity group-hover:opacity-20">
              💳
            </div>
            <div className="relative">
              <h3 className="text-lg font-semibold text-purple-900">
                Registrar Pago
              </h3>
              <p className="mt-1 text-sm text-purple-600">Agregar nuevo pago</p>
            </div>
          </button>
        ) : (
          <Button variant="default">Registrar Pago</Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full p-0 sm:w-[420px] sm:max-w-[420px]">
        <div className="h-full overflow-y-auto p-4">
          <SheetHeader className="pb-2 text-left">
            <SheetTitle>Registrar pago</SheetTitle>
          </SheetHeader>
          <PaymentCard client={client} update={update} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
