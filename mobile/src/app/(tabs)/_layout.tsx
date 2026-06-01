import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/state/auth";

export default function TabsLayout() {
  const { hydrated, session } = useAuth();

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#24a7b4",
        tabBarInactiveTintColor: "#8a96a8",
        headerStyle: { backgroundColor: "#021416" },
        headerTitleStyle: { color: "#ecf4ff" },
        tabBarStyle: { backgroundColor: "#021416", borderTopColor: "#0a2026" },
      }}
    >
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
      <Tabs.Screen name="billing" options={{ title: "Billing" }} />
      <Tabs.Screen name="sheet" options={{ title: "Sheet" }} />
      <Tabs.Screen name="export" options={{ title: "Export" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#021416" },
});
