import { useEffect, useLayoutEffect, useState } from "react";

import { PageContainer } from "~/renderer/components/PageContainer/PageContainer";
import { PageContent } from "~/renderer/components/PageContent/PageContent";
import { PageHeader } from "~/renderer/components/PageHeader/PageHeader";
import { type TabItem, Tabs } from "~/renderer/components/Tabs/Tabs";
import { CaptureFormatComparisonView } from "~/renderer/modules/capture-guide/CaptureGuide.components/CaptureFormatComparisonView/CaptureFormatComparisonView";
import { CaptureStorageView } from "~/renderer/modules/capture-guide/CaptureGuide.components/CaptureStorageView/CaptureStorageView";
import { CaptureTemplatesView } from "~/renderer/modules/capture-guide/CaptureGuide.components/CaptureTemplatesView/CaptureTemplatesView";
import { useCaptureGuideShallow } from "~/renderer/store";

type CaptureGuideTab = "formats" | "storage" | "templates";
const captureGuideEstimateDelayMs = 450;

const captureGuideTabs: TabItem<CaptureGuideTab>[] = [
  {
    label: "Templates",
    panelId: "capture-guide-panel-templates",
    tabId: "capture-guide-tab-templates",
    value: "templates",
  },
  {
    label: "Estimated recording storage",
    panelId: "capture-guide-panel-storage",
    tabId: "capture-guide-tab-storage",
    value: "storage",
  },
  {
    label: "Format comparison",
    panelId: "capture-guide-panel-formats",
    tabId: "capture-guide-tab-formats",
    value: "formats",
  },
];

function CaptureGuidePage() {
  const [activeTab, setActiveTab] = useState<CaptureGuideTab>("templates");
  const [canLoadEstimates, setCanLoadEstimates] = useState(false);
  const resetApplicationStatus = useCaptureGuideShallow(
    (captureGuide) => captureGuide.resetApplicationStatus,
  );

  useLayoutEffect(() => {
    resetApplicationStatus();

    return resetApplicationStatus;
  }, [resetApplicationStatus]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCanLoadEstimates(true);
    }, captureGuideEstimateDelayMs);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const handleTabChange = (tab: CaptureGuideTab) => {
    setActiveTab(tab);
  };
  const handleFormatComparisonRequest = () => {
    handleTabChange("formats");
  };

  return (
    <PageContainer>
      <PageHeader
        actions={
          <Tabs
            ariaLabel="Capture guide sections"
            items={captureGuideTabs}
            size="xs"
            value={activeTab}
            onChange={handleTabChange}
          />
        }
        subtitle="Choose a simple starting point or plan storage without guessing."
        title="Capture Guide"
      />
      <PageContent>
        <div
          aria-labelledby={`capture-guide-tab-${activeTab}`}
          className="pb-6"
          id={`capture-guide-panel-${activeTab}`}
          role="tabpanel"
        >
          {activeTab === "templates" && (
            <CaptureTemplatesView
              canLoadEstimates={canLoadEstimates}
              onFormatComparisonRequest={handleFormatComparisonRequest}
            />
          )}
          {activeTab === "storage" && (
            <CaptureStorageView canLoadEstimates={canLoadEstimates} />
          )}
          {activeTab === "formats" && <CaptureFormatComparisonView />}
        </div>
      </PageContent>
    </PageContainer>
  );
}

export { CaptureGuidePage };
