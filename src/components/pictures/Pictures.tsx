import { reportPictureSvg, travelPictureSvg } from '@/lib/pictures';

interface PictureProps {
  /** Width and height on screen, in pixels */
  size?: number;
  className?: string;
}

// The SVG text is written out in lib/pictures.ts, never taken from a person,
// so it can go on the page as it is. The pictures sit beside their own label,
// so a screen reader is told to pass over them.
function Picture({ svg, size, className = '' }: { svg: string; size: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block flex-shrink-0 leading-none ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** WakaGuard's own picture for a kind of road report */
export function ReportPicture({ type, size = 40, className }: PictureProps & { type: string }) {
  return <Picture svg={reportPictureSvg(type, size)} size={size} className={className} />;
}

/** WakaGuard's own picture for a way of travelling */
export function TravelPicture({ mode, size = 40, className }: PictureProps & { mode: string }) {
  return <Picture svg={travelPictureSvg(mode, size)} size={size} className={className} />;
}
