import { createFileRoute } from "@tanstack/react-router";

import { CaptureGuidePage } from "~/renderer/modules/capture-guide/CaptureGuide.page/CaptureGuidePage/CaptureGuidePage";

export const Route = createFileRoute("/capture-guide")({
  component: CaptureGuidePage,
});
