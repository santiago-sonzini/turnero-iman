export function MagnetLogo({ particles = false }: { particles?: boolean }) {
  return (
    <span className="magnet-wrap" aria-hidden="true">
      {particles && <span className="magnet-particles"><i>✂</i><i>✦</i><i>●</i></span>}
      <svg className="magnet-logo" viewBox="0 0 120 130">
        <path className="magnet-border" d="M22 25v52a38 38 0 0 0 76 0V25" />
        <path className="magnet-body" d="M22 25v52a38 38 0 0 0 76 0V25" />
        <rect className="magnet-pole" x="8" y="13" width="28" height="27" rx="5" />
        <rect className="magnet-pole" x="84" y="13" width="28" height="27" rx="5" />
        <path className="magnet-spark" d="M60 7v-6M48 11l-5-5M72 11l5-5" />
      </svg>
    </span>
  );
}
