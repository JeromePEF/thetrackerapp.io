import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Export: stub for v1.
 *
 * The web dashboard builds CSV/JSON client-side from state already in memory.
 * For mobile we'll port the same generator + use expo-file-system / expo-sharing
 * in a follow-up. Backend has no /api/account/export endpoint yet.
 */
export default function ExportScreen() {
  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Export</Text>
        <Text style={styles.subtitle}>
          CSV and JSON exports are coming in the next build. For now you can export from the web dashboard at thetrackerapp.io.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#021416" },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 48, gap: 16 },
  title: { color: "#ecf4ff", fontSize: 26, fontWeight: "700" },
  subtitle: { color: "#8a96a8", fontSize: 15, lineHeight: 22 },
});
