import { createFileRoute } from "@tanstack/react-router";

import {
  getSettingsCategoryFromSlug,
  getSettingsCategorySlug,
  type SettingsCategory,
  type SettingsCategorySlug,
  SettingsPage,
} from "~/renderer/modules/settings/Settings.page/SettingsPage/SettingsPage";

interface SettingsSearch {
  tab?: SettingsCategorySlug;
}

function validateSettingsSearch(
  search: Record<string, unknown>,
): SettingsSearch {
  return getSettingsCategoryFromSlug(search.tab)
    ? { tab: search.tab as SettingsCategorySlug }
    : {};
}

function SettingsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const initialCategory = getSettingsCategoryFromSlug(search.tab) ?? "Game";
  const handleCategoryChange = (category: SettingsCategory) => {
    void navigate({
      replace: true,
      search: {
        tab: getSettingsCategorySlug(category),
      },
    });
  };

  return (
    <SettingsPage
      initialCategory={initialCategory}
      onCategoryChange={handleCategoryChange}
    />
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
  validateSearch: validateSettingsSearch,
});
