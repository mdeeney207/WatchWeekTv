import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ServicesScreen from "../screens/ServicesScreen";
import SelectShowsScreen from "../screens/SelectShowsScreen";
import AddShowScreen from "../screens/AddShowScreen"; // <-- adjust path/name if yours differs

export type ServicesStackParamList = {
  ServicesMain: undefined;
  SelectShows: undefined;
  AddShow: undefined;
};

const Stack = createNativeStackNavigator<ServicesStackParamList>();

export default function ServicesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <Stack.Screen name="ServicesMain" component={ServicesScreen} />
      <Stack.Screen name="SelectShows" component={SelectShowsScreen} />
      <Stack.Screen name="AddShow" component={AddShowScreen} />
    </Stack.Navigator>
  );
}
