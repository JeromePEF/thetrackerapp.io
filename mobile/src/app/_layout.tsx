import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";

import { AuthProvider } from "@/state/auth";

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <AuthProvider>
      <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
