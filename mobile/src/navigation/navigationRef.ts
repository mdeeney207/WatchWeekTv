import { createNavigationContainerRef } from "@react-navigation/native";

export type RootNavParamList = {
  AuthGate: undefined;
  AppTabs: undefined;

  // Tab routes (must match AppTabParamList names)
  Week: undefined;
  Tonight: { focusEpisodeId?: string } | undefined;
  ServicesTab: undefined;
  Settings: undefined;
};

export const navigationRef = createNavigationContainerRef<RootNavParamList>();
