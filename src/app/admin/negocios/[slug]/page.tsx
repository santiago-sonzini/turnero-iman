import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  ExternalLink,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { instagramHandle, instagramUrl } from "@/lib/instagram";
import { normalizeMapsUrl } from "@/lib/maps";
import { whatsappUrl } from "@/lib/phone";
import { updateTenantSubscription } from "@/app/actions/admin";
import { getTenantDetail } from "@/server/admin/metrics";
import { formatoArs } from "@/server/plans";

export const metadata: Metadata = { title: "Detalle del negocio" };

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ turnos?: string | string[]; suscripcion?: string | string[] }>;
};

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const appointmentStatuses = ["CONFIRMADO", "ASISTIO", "NO_VINO", "CANCELADO"] as const;
const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const fieldClass = "mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-200 outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10";
type Detail = NonNullable<Awaited<ReturnType<typeof getTenantDetail>>>;
type Appointment = Detail["appointments"][number];

export default async function NegocioDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const rawPage = Array.isArray(query.turnos) ? query.turnos[0] : query.turnos;
  const subscriptionNotice = Array.isArray(query.suscripcion) ? query.suscripcion[0] : query.suscripcion;
  const requestedPage = Number.parseInt(rawPage ?? "1", 10);
  const data = await getTenantDetail(slug, Number.isFinite(requestedPage) ? requestedPage : 1);
  if (!data) notFound();

  const { tenant } = data;
  const profile = tenant.profile;
  const contactPhone = profile?.phone ?? tenant.users.find((user) => user.phone)?.phone ?? null;
  const contactEmail = profile?.notifyEmail ?? tenant.users[0]?.email ?? tenant.mpPayerEmail;
  const instagram = instagramHandle(profile?.instagram);
  const mapsUrl = normalizeMapsUrl(profile?.mapsUrl);

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
      <header>
        <Link href="/admin/negocios" className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Volver a negocios
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusPill value={tenant.planStatus} />
              <span className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-xs text-zinc-400">
                Acceso: {accessLabel(data.access)}
              </span>
            </div>
            <h1 className="truncate text-3xl tracking-tight text-white sm:text-4xl">{profile?.name ?? tenant.name}</h1>
            <p className="mt-2 text-sm text-zinc-500">/{tenant.slug} · Alta {formatDate(tenant.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {contactPhone ? (
              <a href={whatsappUrl(contactPhone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/15">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            ) : null}
            <Link href={`/${tenant.slug}/turnos`} target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-orange-400 px-3.5 py-2.5 text-sm font-black text-zinc-950 transition hover:bg-orange-300">
              Ver agenda pública <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {subscriptionNotice ? <SubscriptionNotice status={subscriptionNotice} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumen del negocio">
        <Metric icon={CalendarDays} label="Turnos totales" value={tenant._count.appointments} />
        <Metric icon={Clock3} label="Próximos" value={data.upcomingAppointments} />
        <Metric icon={Users} label="Clientes" value={tenant._count.clients} />
        <Metric icon={BriefcaseBusiness} label="Servicios" value={tenant._count.services} />
        <Metric icon={CircleDollarSign} label="MRR" value={formatoArs(data.mrrArs)} />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.7fr)]">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]">
          <div className="border-b border-white/10 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h2 className="text-lg text-zinc-100">Turnos</h2>
                <p className="text-sm text-zinc-500">Historial completo, ordenado del más reciente al más antiguo.</p>
              </div>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {appointmentStatuses.map((status) => (
                  <span key={status} className={`rounded-full px-2.5 py-1 text-xs ${statusTone(status)}`}>
                    {statusLabel(status)} {data.appointmentStatusCounts[status] ?? 0}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <AppointmentsTable appointments={data.appointments} />
          <Pagination slug={tenant.slug} page={data.page} totalPages={data.totalPages} />
        </section>

        <div className="space-y-6">
          <InfoSection title="Contacto" icon={UserRound}>
            <InfoRow label="Teléfono" value={contactPhone} icon={Phone} href={contactPhone ? `tel:${contactPhone}` : undefined} />
            <InfoRow label="Email principal" value={contactEmail} icon={Mail} href={contactEmail ? `mailto:${contactEmail}` : undefined} />
            <InfoRow label="Instagram" value={instagram ? `@${instagram}` : null} icon={Instagram} href={instagram ? instagramUrl(instagram) : undefined} external />
            <InfoRow label="Dirección" value={profile?.address ?? (mapsUrl ? "Ver ubicación en Maps" : null)} icon={MapPin} href={mapsUrl ?? undefined} external />
            {tenant.users.map((user, index) => (
              <div key={user.id} className="rounded-xl border border-white/[.07] bg-black/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-600">Usuario {index + 1}</p>
                <p className="mt-1 text-sm font-bold text-zinc-200">{user.name ?? "Sin nombre"}</p>
                <a href={`mailto:${user.email}`} className="mt-1 block break-all text-xs text-orange-300 hover:underline">{user.email}</a>
                <p className="mt-1 text-xs text-zinc-600">{user.phone ?? "Sin teléfono"} · alta {formatDate(user.createdAt)}</p>
              </div>
            ))}
          </InfoSection>

          <SubscriptionEditor data={data} />
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <InfoSection title="Información y configuración del negocio" icon={Settings2}>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <KeyValue label="Razón / nombre interno" value={tenant.name} />
            <KeyValue label="Tipo de negocio" value={profile?.businessType ?? "—"} />
            <KeyValue label="Descripción" value={profile?.description ?? "—"} />
            <KeyValue label="Zona horaria" value={profile?.timezone ?? "—"} />
            <KeyValue label="Tema" value={profile?.theme ?? "—"} />
            <KeyValue label="Color" value={profile?.accent ?? "—"} />
            <KeyValue label="Anticipación mínima" value={profile ? `${profile.bookingLeadMinutes} min` : "—"} />
            <KeyValue label="Horizonte de reserva" value={profile ? `${profile.bookingHorizonDays} días` : "—"} />
            <KeyValue label="Intervalo de agenda" value={profile ? `${profile.slotStepMinutes} min` : "—"} />
            <KeyValue label="Buffer entre turnos" value={profile ? `${profile.bufferMinutes} min` : "—"} />
            <KeyValue label="Cancelación permitida" value={profile ? `${profile.cancelWindowHours} h antes` : "—"} />
            <KeyValue label="Muestra precios" value={yesNo(profile?.showPrices)} />
            <KeyValue label="Señas habilitadas" value={yesNo(profile?.depositsEnabled)} />
            <KeyValue label="Aviso por reserva" value={yesNo(profile?.notifyOnBooking)} />
            <KeyValue label="Email para avisos" value={profile?.notifyEmail ?? "—"} />
            <KeyValue label="Paso de onboarding" value={tenant.onboardingStep} />
            <KeyValue label="Add-ons" value={tenant.addons.length ? tenant.addons.join(", ") : "Ninguno"} />
            <KeyValue label="Vacaciones cargadas" value={vacationSummary(profile?.vacations)} />
          </div>
        </InfoSection>

        <InfoSection title="Horarios" icon={Clock3}>
          <div className="grid gap-2 sm:grid-cols-2">
            {weekdays.map((day, weekday) => {
              const hours = tenant.workingHours.filter((row) => row.weekday === weekday && row.active);
              return (
                <div key={day} className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-black/10 px-3 py-2.5">
                  <span className="w-20 text-sm text-zinc-400">{day}</span>
                  <span className="text-sm font-medium text-zinc-200">
                    {hours.length ? hours.map((hour) => `${minutesToTime(hour.startMinutes)}–${minutesToTime(hour.endMinutes)}`).join(", ") : "Cerrado"}
                  </span>
                </div>
              );
            })}
          </div>
        </InfoSection>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <InfoSection title={`Servicios (${tenant._count.services})`} icon={BriefcaseBusiness}>
          <div className="grid gap-2 sm:grid-cols-2">
            {tenant.services.map((service) => (
              <div key={service.id} className="rounded-xl border border-white/[.07] bg-black/10 p-3">
                <div className="flex items-start gap-2">
                  <span aria-hidden>{service.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-zinc-200">{service.name}</b>
                    <small className="text-zinc-600">{service.durationMinutes} min · {formatoArs(service.priceCents / 100)} · {service._count.appointments} turnos</small>
                  </span>
                  <span className={`h-2 w-2 rounded-full ${service.active ? "bg-emerald-400" : "bg-zinc-700"}`} title={service.active ? "Activo" : "Inactivo"} />
                </div>
                {service.description ? <p className="mt-2 text-xs text-zinc-500">{service.description}</p> : null}
              </div>
            ))}
            {!tenant.services.length ? <Empty label="No cargó servicios" /> : null}
          </div>
        </InfoSection>

        <InfoSection title={`Equipo (${tenant._count.staff})`} icon={Users}>
          <div className="grid gap-2 sm:grid-cols-2">
            {tenant.staff.map((staff) => (
              <div key={staff.id} className="rounded-xl border border-white/[.07] bg-black/10 p-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden>{staff.emoji}</span>
                  <b className="text-sm text-zinc-200">{staff.name}</b>
                  <span className={`ml-auto h-2 w-2 rounded-full ${staff.active ? "bg-emerald-400" : "bg-zinc-700"}`} title={staff.active ? "Activo" : "Inactivo"} />
                </div>
                <p className="mt-1 text-xs text-zinc-600">{staff._count.appointments} turnos</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {staff.services.length ? staff.services.map((link) => link.service.name).join(", ") : "Todos los servicios"}
                </p>
              </div>
            ))}
            {!tenant.staff.length ? <Empty label="No cargó profesionales" /> : null}
          </div>
        </InfoSection>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <InfoSection title={`Clientes recientes (${tenant._count.clients})`} icon={Users}>
          <div className="grid gap-2 sm:grid-cols-2">
            {tenant.clients.map((client) => (
              <div key={client.id} className="rounded-xl border border-white/[.07] bg-black/10 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-400/10 text-sm font-black text-orange-300">{initials(client.name)}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm text-zinc-200">{client.name}</b>
                    <small className="block truncate text-zinc-600">{client.phone ?? "Sin teléfono"}{client.email ? ` · ${client.email}` : ""}</small>
                    <small className="text-zinc-600">{client._count.appointments} turnos · actualizado {formatDate(client.updatedAt)}</small>
                  </span>
                </div>
                {client.notes ? <p className="mt-2 text-xs text-zinc-500">Nota: {client.notes}</p> : null}
              </div>
            ))}
            {!tenant.clients.length ? <Empty label="Todavía no tiene clientes" /> : null}
          </div>
        </InfoSection>

        <div className="space-y-6">
          <InfoSection title="Mensajería y WhatsApp" icon={MessageCircle}>
            <KeyValue label="Estado de WhatsApp" value={tenant.whatsappSession?.health ?? "Sin conectar"} />
            <KeyValue label="Número conectado" value={tenant.whatsappSession?.phone ?? "—"} />
            <KeyValue label="Última conexión" value={formatDateTime(tenant.whatsappSession?.lastSeenAt)} />
            <KeyValue label="Último error" value={tenant.whatsappSession?.lastError ?? "—"} />
            <KeyValue label="Mensajes totales" value={String(tenant._count.messageJobs)} />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(data.messageStatusCounts).map(([status, count]) => <span key={status} className="rounded-full bg-white/[.06] px-2.5 py-1 text-xs text-zinc-400">{status}: {count}</span>)}
            </div>
          </InfoSection>

          <InfoSection title="Identificadores" icon={ShieldCheck}>
            <KeyValue label="Tenant ID" value={tenant.id} mono />
            <KeyValue label="Slug" value={tenant.slug} mono />
            <KeyValue label="Última actualización" value={formatDateTime(tenant.updatedAt)} />
          </InfoSection>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <InfoSection title={`Promociones (${tenant._count.promotions})`} icon={CircleDollarSign}>
          <div className="space-y-2">
            {tenant.promotions.map((promotion) => (
              <div key={promotion.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[.07] bg-black/10 p-3">
                <span className={`h-2 w-2 rounded-full ${promotion.active && promotion.expiresAt > new Date() ? "bg-emerald-400" : "bg-zinc-700"}`} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm text-zinc-200">{promotion.name}</b>
                  <small className="text-zinc-600">{promotion.kind.replaceAll("_", " ")} · {promotion.service?.name ?? "Todos los servicios"}</small>
                </span>
                <span className="text-xs text-zinc-500">vence {formatDate(promotion.expiresAt)}</span>
              </div>
            ))}
            {!tenant.promotions.length ? <Empty label="No cargó promociones" /> : null}
          </div>
        </InfoSection>

        <InfoSection title="Actividad técnica reciente" icon={CheckCircle2}>
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[.14em] text-zinc-600">Emails</p>
              {data.recentEmails.map((email) => (
                <div key={email.id} className="flex items-start gap-2 border-b border-white/[.06] py-2 last:border-0">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${email.ok ? "bg-emerald-400" : "bg-red-400"}`} />
                  <span className="min-w-0 flex-1 text-xs text-zinc-500"><b className="text-zinc-300">{email.template}</b> a {email.to}{email.error ? ` · ${email.error}` : ""}</span>
                  <time className="shrink-0 text-[11px] text-zinc-700">{formatDateTime(email.createdAt)}</time>
                </div>
              ))}
              {!data.recentEmails.length ? <p className="text-xs text-zinc-600">Sin emails registrados.</p> : null}
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[.14em] text-zinc-600">Errores</p>
              {data.recentErrors.map((error) => (
                <div key={error.id} className="flex items-start gap-2 border-b border-white/[.06] py-2 last:border-0">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-400" />
                  <span className="min-w-0 flex-1 text-xs text-zinc-500"><b className="text-zinc-300">{error.scope}</b> · {error.message}</span>
                  <time className="shrink-0 text-[11px] text-zinc-700">{formatDateTime(error.createdAt)}</time>
                </div>
              ))}
              {!data.recentErrors.length ? <p className="text-xs text-zinc-600">Sin errores registrados.</p> : null}
            </div>
          </div>
        </InfoSection>
      </div>
    </main>
  );
}

function SubscriptionEditor({ data }: { data: Detail }) {
  const { tenant } = data;
  const saveSubscription = updateTenantSubscription.bind(null, tenant.id);
  return (
    <InfoSection title="Editar suscripción" icon={CreditCard}>
      <form action={saveSubscription} className="space-y-4">
        <div className="rounded-xl border border-orange-400/15 bg-orange-400/[.06] p-3 text-xs leading-relaxed text-zinc-400">
          <b className="text-orange-300">Acceso actual: {accessLabel(data.access)}</b>
          <p className="mt-1">ACTIVE da acceso pleno. TRIALING requiere un trial futuro, PAST_DUE una gracia futura y CANCELLED una fecha de baja futura para conservar acceso hasta ese día.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-zinc-500">
            Plan
            <select name="plan" defaultValue={tenant.plan ?? ""} className={fieldClass}>
              <option value="">Sin plan</option>
              <option value="TURNOS">Turnos</option>
              <option value="TURNOS_AUTO">Turnos Pro</option>
            </select>
          </label>
          <label className="text-xs text-zinc-500">
            Estado
            <select name="planStatus" defaultValue={tenant.planStatus} className={fieldClass}>
              <option value="ONBOARDING">ONBOARDING</option>
              <option value="TRIALING">TRIALING</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAST_DUE">PAST_DUE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </label>
          <DateTimeField name="trialEndsAt" label="Fin del trial" value={tenant.trialEndsAt} />
          <DateTimeField name="graceUntil" label="Fin del período de gracia" value={tenant.graceUntil} />
          <DateTimeField name="mpLastPaymentAt" label="Fecha del último pago" value={tenant.mpLastPaymentAt} />
          <DateTimeField name="cancellationEffectiveAt" label="Baja efectiva" value={tenant.cancellationEffectiveAt} />
        </div>

        <label className="block text-xs text-zinc-500">
          Email del pagador
          <input type="email" name="mpPayerEmail" defaultValue={tenant.mpPayerEmail ?? ""} placeholder="pagador@negocio.com" className={fieldClass} />
        </label>

        <label className="block text-xs text-zinc-500">
          Add-ons <span className="text-zinc-700">(separados por coma)</span>
          <input name="addons" defaultValue={tenant.addons.join(", ")} placeholder="whatsapp_auto, multi_staff" className={fieldClass} />
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[.07] bg-black/10 p-3 text-sm text-zinc-300">
          <input type="checkbox" name="mpCancellationPending" defaultChecked={tenant.mpCancellationPending} className="h-4 w-4 accent-orange-400" />
          Cancelación pendiente de confirmar en Mercado Pago
        </label>

        <details className="rounded-xl border border-white/[.07] bg-black/10 p-3">
          <summary className="cursor-pointer text-xs font-bold text-zinc-400">Identificadores de Mercado Pago</summary>
          <p className="mt-2 text-xs leading-relaxed text-amber-300/80">Cambialos sólo si verificaste el dato en Mercado Pago: los webhooks y la conciliación dependen de estos identificadores.</p>
          <div className="mt-3 space-y-3">
            <TextField name="mpPreapprovalId" label="Preapproval ID" value={tenant.mpPreapprovalId} />
            <TextField name="mpPreapprovalPlanId" label="Preapproval Plan ID" value={tenant.mpPreapprovalPlanId} />
            <TextField name="mpLastPaymentPreapprovalId" label="Preapproval del último pago" value={tenant.mpLastPaymentPreapprovalId} />
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/[.07] pt-4">
          <span className="text-xs text-zinc-600">MRR actual: {formatoArs(data.mrrArs)}</span>
          <button type="submit" className="ml-auto inline-flex items-center gap-2 rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-black text-zinc-950 transition hover:bg-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300/60">
            <Save className="h-4 w-4" /> Guardar suscripción
          </button>
        </div>
      </form>
    </InfoSection>
  );
}

function SubscriptionNotice({ status }: { status: string }) {
  const message = status === "guardada"
    ? "La suscripción se actualizó correctamente y el acceso fue recalculado."
    : status === "datos-invalidos"
      ? "No se guardó: revisá las fechas, el email y los datos ingresados."
      : status === "id-duplicado"
        ? "No se guardó: uno de los identificadores de Mercado Pago ya pertenece a otro negocio."
        : "No pudimos actualizar la suscripción. Volvé a intentarlo.";
  const ok = status === "guardada";
  return <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${ok ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-red-400/20 bg-red-400/10 text-red-300"}`}>{message}</div>;
}

function DateTimeField({ name, label, value }: { name: string; label: string; value: Date | null }) {
  return <label className="text-xs text-zinc-500">{label}<input type="datetime-local" name={name} defaultValue={formatDateTimeLocal(value)} className={fieldClass} /></label>;
}

function TextField({ name, label, value }: { name: string; label: string; value: string | null }) {
  return <label className="block text-xs text-zinc-500">{label}<input name={name} defaultValue={value ?? ""} className={`${fieldClass} font-mono text-xs`} /></label>;
}

function AppointmentsTable({ appointments }: { appointments: Appointment[] }) {
  if (!appointments.length) return <div className="px-5 py-16 text-center text-sm text-zinc-600">No hay turnos para mostrar.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[940px] text-left text-sm">
        <thead className="bg-black/20 text-[10px] font-black uppercase tracking-[.13em] text-zinc-600">
          <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Servicio</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Origen / seña</th><th className="px-4 py-3">Notas</th></tr>
        </thead>
        <tbody className="divide-y divide-white/[.06]">
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="align-top transition hover:bg-white/[.025]">
              <td className="whitespace-nowrap px-4 py-3.5"><b className="block text-zinc-200">{formatDate(appointment.startsAt)}</b><small className="text-zinc-600">{formatTime(appointment.startsAt)}–{formatTime(appointment.endsAt)}</small></td>
              <td className="px-4 py-3.5"><b className="block text-zinc-200">{appointment.client.name}</b><small className="block text-zinc-600">{appointment.client.phone ?? "Sin teléfono"}</small>{appointment.client.email ? <small className="block text-zinc-600">{appointment.client.email}</small> : null}</td>
              <td className="px-4 py-3.5"><b className="block text-zinc-200">{appointment.service.emoji} {appointment.service.name}</b><small className="text-zinc-600">{appointment.staff?.name ?? "Sin profesional"} · {formatoArs(appointment.service.priceCents / 100)}</small></td>
              <td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${statusTone(appointment.status)}`}>{statusLabel(appointment.status)}</span></td>
              <td className="px-4 py-3.5"><b className="block text-xs text-zinc-400">{channelLabel(appointment.channel)}</b><small className="text-zinc-600">{depositLabel(appointment)}</small>{appointment.promotion ? <small className="block text-orange-300">Promo: {appointment.promotion.name}</small> : null}</td>
              <td className="max-w-52 px-4 py-3.5 text-xs text-zinc-500">{appointment.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pagination({ slug, page, totalPages }: { slug: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginación de turnos" className="flex items-center justify-between border-t border-white/10 px-5 py-4">
      <p className="text-xs text-zinc-600">Página {page} de {totalPages}</p>
      <div className="flex gap-2">
        {page > 1 ? <Link href={`/admin/negocios/${slug}?turnos=${page - 1}`} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:bg-white/[.05] hover:text-zinc-200"><ChevronLeft className="h-3.5 w-3.5" /> Anterior</Link> : null}
        {page < totalPages ? <Link href={`/admin/negocios/${slug}?turnos=${page + 1}`} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:bg-white/[.05] hover:text-zinc-200">Siguiente <ChevronRight className="h-3.5 w-3.5" /></Link> : null}
      </div>
    </nav>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string | number }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4"><span className="rounded-xl bg-orange-400/10 p-2.5 text-orange-300"><Icon className="h-5 w-5" /></span><span><small className="block text-zinc-600">{label}</small><b className="font-mono text-xl text-zinc-100">{value}</b></span></div>;
}

function InfoSection({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><div className="mb-4 flex items-center gap-2"><Icon className="h-4 w-4 text-orange-300" /><h2 className="text-lg text-zinc-100">{title}</h2></div><div className="space-y-3">{children}</div></section>;
}

function InfoRow({ label, value, icon: Icon, href, external = false }: { label: string; value: string | null | undefined; icon: typeof Phone; href?: string; external?: boolean }) {
  return <div className="flex items-start gap-3"><span className="rounded-lg bg-white/[.05] p-2 text-zinc-500"><Icon className="h-4 w-4" /></span><span className="min-w-0"><small className="block text-zinc-600">{label}</small>{href && value ? <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="inline-flex items-center gap-1 break-all text-sm font-medium text-zinc-200 hover:text-orange-300">{value}{external ? <ArrowUpRight className="h-3.5 w-3.5" /> : null}</a> : <b className="block break-words text-sm text-zinc-200">{value ?? "—"}</b>}</span></div>;
}

function KeyValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-4 border-b border-white/[.06] pb-2 last:border-0 last:pb-0"><span className="text-xs text-zinc-600">{label}</span><span className={`max-w-[65%] break-words text-right text-xs text-zinc-300 ${mono ? "font-mono" : ""}`}>{value}</span></div>;
}

function Empty({ label }: { label: string }) { return <p className="py-6 text-center text-sm text-zinc-600">{label}</p>; }

function StatusPill({ value }: { value: string }) {
  const tone = value === "ACTIVE" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : value === "PAST_DUE" ? "border-amber-400/20 bg-amber-400/10 text-amber-300" : value === "CANCELLED" ? "border-red-400/20 bg-red-400/10 text-red-300" : "border-sky-400/20 bg-sky-400/10 text-sky-300";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>{value}</span>;
}

function formatDate(value: Date | null | undefined) { return value ? value.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE }) : "—"; }
function formatTime(value: Date) { return value.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIME_ZONE }); }
function formatDateTime(value: Date | null | undefined) { return value ? value.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIME_ZONE }) : "—"; }
function formatDateTimeLocal(value: Date | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
function minutesToTime(minutes: number) { return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`; }
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function yesNo(value: boolean | null | undefined) { return value == null ? "—" : value ? "Sí" : "No"; }
function vacationSummary(value: unknown) { return Array.isArray(value) ? `${value.length} período${value.length === 1 ? "" : "s"}` : value ? "Configuradas" : "Ninguna"; }
function statusLabel(status: string) { return ({ CONFIRMADO: "Confirmado", ASISTIO: "Asistió", NO_VINO: "No vino", CANCELADO: "Cancelado" } as Record<string, string>)[status] ?? status; }
function statusTone(status: string) { return ({ CONFIRMADO: "bg-sky-400/10 text-sky-300", ASISTIO: "bg-emerald-400/10 text-emerald-300", NO_VINO: "bg-amber-400/10 text-amber-300", CANCELADO: "bg-red-400/10 text-red-300" } as Record<string, string>)[status] ?? "bg-white/[.06] text-zinc-400"; }
function channelLabel(channel: string) { return ({ OWNER: "Cargado por el negocio", PUBLIC: "Reserva pública", PROMO: "Promoción" } as Record<string, string>)[channel] ?? channel; }
function depositLabel(appointment: Appointment) { if (!appointment.depositRequired) return "Sin seña"; const amount = appointment.depositAmountCents ? formatoArs(appointment.depositAmountCents / 100) : "monto no definido"; return `Seña ${amount} · ${appointment.depositStatus ?? "pendiente"}`; }
function accessLabel(access: NonNullable<Awaited<ReturnType<typeof getTenantDetail>>>["access"]) { if (access.estado === "bloqueado") return `Bloqueado (${access.motivo.replaceAll("_", " ")})`; if (access.estado === "gracia") return `Gracia hasta ${formatDate(access.hasta)}`; if (access.estado === "cancelado") return `Cancela ${formatDate(access.hasta)}`; if (access.estado === "onboarding") return "Onboarding"; return access.diasTrial ? `Pleno · ${access.diasTrial} días de trial` : "Pleno"; }
