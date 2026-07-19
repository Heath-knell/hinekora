import { PageContainer } from "~/renderer/components/PageContainer/PageContainer";
import { PageContent } from "~/renderer/components/PageContent/PageContent";
import { PageHeader } from "~/renderer/components/PageHeader/PageHeader";
import { AuraTabs } from "~/renderer/modules/crop-editor/CropEditor.components/AuraTabs/AuraTabs";
import { CropEditorActions } from "~/renderer/modules/crop-editor/CropEditor.components/CropEditorActions/CropEditorActions";
import { CropEditorPanel } from "~/renderer/modules/crop-editor/CropEditor.components/CropEditorPanel/CropEditorPanel";
import { CropEditorSidebarPanel } from "~/renderer/modules/crop-editor/CropEditor.components/CropEditorSidebarPanel/CropEditorSidebarPanel";
import { ProfileMutationError } from "~/renderer/modules/profiles/Profiles.components/ProfileMutationError/ProfileMutationError";

function CropOverlayPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Aura Manager"
        subtitle="Source area, aura position, and aura overlay behavior."
        actions={<CropEditorActions />}
      />
      <PageContent className="grid content-start grid-cols-12 items-start gap-3">
        <ProfileMutationError className="col-span-12" />
        <AuraTabs />
        <CropEditorSidebarPanel />
        <CropEditorPanel />
      </PageContent>
    </PageContainer>
  );
}

export { CropOverlayPage };
