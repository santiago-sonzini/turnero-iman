// Inyecta uno o varios nodos JSON-LD (Schema.org) como <script type="application/ld+json">.
// Se renderiza en el servidor; los buscadores lo leen del HTML inicial.
export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  const nodes = Array.isArray(data) ? data : [data];
  return (
    <>
      {nodes.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          // El contenido es generado por nosotros (no input de usuario sin sanitizar).
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
    </>
  );
}
