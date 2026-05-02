import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, ActivityIndicator, Image, StyleSheet,
  TouchableOpacity, Alert, TextInput, RefreshControl, SafeAreaView, StatusBar,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";

const API_URL = "http://127.0.0.1:8000";

type Tab = "posts" | "users";

export default function AdminScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getToken = () => AsyncStorage.getItem("access_token");

  // ── fetch all posts with author info ──
const fetchPosts = async () => {
  try {
    const token = await getToken();
    const headers = { Authorization: `Bearer ${token}` };
    const res = await fetch(`${API_URL}/admin/posts`, { headers });
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    const withAuthors = await Promise.all(
      list.map(async (p: any) => {
        try {
          const uRes = await fetch(`${API_URL}/users/id/${p.author_id}`, { headers });
          const u = await uRes.json();
          return { ...p, username: u.username, profile_pic: u.profile_pic };
        } catch {
          return { ...p, username: "unknown", profile_pic: null };
        }
      })
    );
    setPosts(withAuthors);
    setFilteredPosts(withAuthors);
  } catch (e) {
    console.log("Admin fetch posts error:", e);
  }
};

  // ── fetch all users ──
 const fetchUsers = async () => {
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setUsers(list);
    setFilteredUsers(list);
  } catch (e) {
    console.log("Admin fetch users error:", e);
  }
};
  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchPosts(), fetchUsers()]);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  // ── search ──
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const q = text.toLowerCase();
    if (tab === "posts") {
      setFilteredPosts(!q ? posts : posts.filter(p =>
        p.username?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q)
      ));
    } else {
      setFilteredUsers(!q ? users : users.filter(u =>
        u.username?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q)
      ));
    }
  };

  // ── admin delete post ──
  const handleDeletePost = async (postId: string, username: string) => {
  const confirmed = window.confirm(`Delete @${username}'s post? This cannot be undone.`);
  if (!confirmed) return;
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}/admin/posts/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const updated = posts.filter(p => p.id !== postId);
      setPosts(updated);
      setFilteredPosts(updated);
    } else {
      window.alert("Could not delete post.");
    }
  } catch {
    window.alert("Could not connect to server.");
  }
};

const handleDeleteUser = async (userId: string, username: string) => {
  const confirmed = window.confirm(`Delete @${username}'s account and ALL their data? This cannot be undone.`);
  if (!confirmed) return;
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const updatedUsers = users.filter(u => u.id !== userId);
      const updatedPosts = posts.filter(p => p.author_id !== userId);
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      setPosts(updatedPosts);
      setFilteredPosts(updatedPosts);
    } else {
      const body = await res.json();
      window.alert(body.detail ?? "Could not delete user.");
    }
  } catch {
    window.alert("Could not connect to server.");
  }
};

  // ── navigate to edit post (reuse your existing EditPostScreen) ──
  const handleEditPost = (post: any) => {
    const imageUrl = post.image ?? null;
    navigation.navigate("EditPost", {
      postId: post.id,
      currentContent: post.content ?? "",
      currentImage: imageUrl,
    });
  };

  // ── render post row ──
  const renderPost = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.cardHeader}>
        {item.profile_pic ? (
          <Image
            source={{ uri: item.profile_pic.startsWith("http") ? item.profile_pic : `${API_URL}${item.profile_pic}` }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.background }]}>
            <Ionicons name="person" size={14} color={theme.subtext} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardUsername, { color: theme.text }]}>@{item.username}</Text>
          <Text style={[styles.cardTime, { color: theme.subtext }]}>
            {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
          </Text>
        </View>
        {/* EDIT button */}
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: theme.background }]}
          onPress={() => handleEditPost(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={16} color="#6C63FF" />
        </TouchableOpacity>
        {/* DELETE button */}
        <TouchableOpacity
          style={[styles.deleteBtn]}
          onPress={() => handleDeletePost(item.id, item.username)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color="#e0245e" />
        </TouchableOpacity>
      </View>
      {item.content ? (
        <Text style={[styles.cardContent, { color: theme.text }]} numberOfLines={3}>
          {item.content}
        </Text>
      ) : null}
      <Text style={[styles.postId, { color: theme.subtext }]}>ID: {item.id}</Text>
    </View>
  );

  // ── render user row ──
  const renderUser = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.cardHeader}>
        {item.profile_pic ? (
          <Image
            source={{ uri: item.profile_pic.startsWith("http") ? item.profile_pic : `${API_URL}${item.profile_pic}` }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.background }]}>
            <Text style={[styles.avatarInitial, { color: theme.text }]}>
              {(item.username || "?")[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardUsername, { color: theme.text }]}>@{item.username}</Text>
          {item.full_name ? (
            <Text style={[styles.cardTime, { color: theme.subtext }]}>{item.full_name}</Text>
          ) : null}
          <Text style={[styles.cardTime, { color: theme.subtext }]}>{item.email}</Text>
        </View>
        {/* No delete for admin itself */}
        {item.username !== "admin" && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteUser(item.id, item.username)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#e0245e" />
          </TouchableOpacity>
        )}
        {item.username === "admin" && (
          <View style={[styles.adminBadge]}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.card }]}>
        <View style={styles.headerLeft}>
          <View style={styles.adminIconWrap}>
            <Ionicons name="shield-checkmark" size={20} color="#6C63FF" />
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Admin Panel</Text>
        </View>
        <Text style={[styles.headerSub, { color: theme.subtext }]}>
          {tab === "posts" ? `${posts.length} posts` : `${users.length} users`}
        </Text>
      </View>

      {/* TABS */}
      <View style={[styles.tabRow, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[styles.tab, tab === "posts" && styles.tabActive]}
          onPress={() => { setTab("posts"); setSearchQuery(""); setFilteredPosts(posts); }}
          activeOpacity={0.8}
        >
          <Ionicons name="newspaper-outline" size={16} color={tab === "posts" ? "#6C63FF" : theme.subtext} />
          <Text style={[styles.tabText, { color: tab === "posts" ? "#6C63FF" : theme.subtext }]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "users" && styles.tabActive]}
          onPress={() => { setTab("users"); setSearchQuery(""); setFilteredUsers(users); }}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={16} color={tab === "users" ? "#6C63FF" : theme.subtext} />
          <Text style={[styles.tabText, { color: tab === "users" ? "#6C63FF" : theme.subtext }]}>Users</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={[styles.searchBox, { backgroundColor: theme.card }]}>
        <Ionicons name="search" size={16} color={theme.subtext} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={tab === "posts" ? "Search by username or content..." : "Search by username or name..."}
          placeholderTextColor={theme.subtext}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={16} color={theme.subtext} />
          </TouchableOpacity>
        )}
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#6C63FF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tab === "posts" ? filteredPosts : filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={tab === "posts" ? renderPost : renderUser}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAll(); }}
              tintColor={theme.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={theme.subtext} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.subtext }]}>Nothing found</Text>
            </View>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  adminIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(108,99,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  headerSub: { fontSize: 12 },
  tabRow: {
    flexDirection: "row", marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8, borderRadius: 10,
  },
  tabActive: { backgroundColor: "rgba(108,99,255,0.12)" },
  tabText: { fontSize: 14, fontWeight: "600" },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14 },
  card: { borderRadius: 12, padding: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { justifyContent: "center", alignItems: "center" },
  avatarInitial: { fontSize: 14, fontWeight: "700" },
  cardUsername: { fontSize: 14, fontWeight: "700" },
  cardTime: { fontSize: 11, marginTop: 1 },
  cardContent: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  postId: { fontSize: 10, marginTop: 6 },
  editBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center", marginRight: 4,
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(224,36,94,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  adminBadge: {
    backgroundColor: "rgba(108,99,255,0.12)",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  adminBadgeText: { color: "#6C63FF", fontSize: 10, fontWeight: "800" },
  empty: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 14 },
});