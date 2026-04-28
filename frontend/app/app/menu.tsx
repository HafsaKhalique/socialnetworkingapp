import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function MenuScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const options = [
    {
      label: "Edit Profile",
      icon: "person-outline",
      route: "/(tabs)/profile/edit",
    },
    {
      label: "Settings",
      icon: "settings-outline",
      route: "/(tabs)/settings",
    },
    {
      label: "Login",
      icon: "key-outline",
      route: "/",
    },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <Text style={[styles.heading, { color: theme.text }]}>Menu</Text>

      {options.map((item) => (
        <TouchableOpacity
          key={item.label}
          style={[styles.row, { borderBottomColor: theme.card }]}
          onPress={() => router.push(item.route as any)}
          activeOpacity={0.7}
        >
          <Ionicons name={item.icon as any} size={22} color={theme.text} />
          <Text style={[styles.label, { color: theme.text }]}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20 },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
});