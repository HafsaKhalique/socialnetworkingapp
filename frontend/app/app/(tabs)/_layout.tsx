import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.subtext,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.background,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarButton: HapticTab,
      }}
    >
      {/* ───── HOME (FEED) ───── */}
      <Tabs.Screen
        name="feed"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* ───── SEARCH ───── */}
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
        }}
      />




      {/* ───── CREATE POST ───── */}
 <Tabs.Screen
  name="post"
  options={{
    title: "post",
    tabBarIcon: ({ focused }) => (
      <Ionicons
        name={focused ? "add-circle" : "add-circle-outline"}
        size={24}
        color="rgb(104, 112, 118)"
      />
    ),
  }}
/>

      {/* ───── MESSAGES ───── */}
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* ───── PROFILE ───── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />



<Tabs.Screen
  name="menu"
  options={{
    title: "",
    tabBarIcon: ({ color }) => (
      <Ionicons name="menu" size={28} color={color} />
    ),
  }}
/>

      {/* ───── HIDDEN SCREEN ───── */}
{/* ───── HIDDEN SCREENS ───── */}
      <Tabs.Screen name="edit-post" options={{ href: null }} />
      <Tabs.Screen name="signup" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/[id]" options={{ href: null }} />
      <Tabs.Screen name="dm/[userId]" options={{ href: null }} />
    </Tabs>
  );
}