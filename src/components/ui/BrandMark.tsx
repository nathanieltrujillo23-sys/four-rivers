import { useId } from "react";
import { APP_PALETTE, logoSvg, type LogoId } from "../../brand/logoMarks.mjs";
import { useLogoChoice } from "../../lib/logoChoice";

/** The app's logo, as chosen in Admin (Tools). Reused wherever "the whole course" needs a visual (header,
 * certificate, course-complete celebration) instead of each spot drawing its own copy. Pass `logo` to show a
 * specific one, as the Admin chooser does. */
export function BrandMark({ size = 26, logo }: { size?: number; logo?: LogoId }) {
  const chosen = useLogoChoice();
  const uid = useId().replace(/:/g, "");
  // The markup is a fixed drawing from src/brand/logoMarks.mjs, never user input.
  return (
    <span
      className="inline-flex shrink-0"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: logoSvg(logo ?? chosen, { size, uid, palette: APP_PALETTE }) }}
    />
  );
}
