import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, FlatList, ActivityIndicator, Image, StyleSheet,
  RefreshControl, TouchableOpacity, Modal, TextInput, Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";
import { decode as atob } from "base-64";
const API_URL = "http://127.0.0.1:8000";

// ─── SHARE MODAL ───────────────────────────────────────
function ShareModal({
  visible, onClose, post, theme,
}: {
  visible: boolean;
  onClose: () => void;
  post: any;
  theme: any;
}) {
  const navigation = useNavigation<any>();
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const loadMutuals = async () => {
    setLoading(true);
    setSent(new Set());
    setQuery("");
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) { setLoading(false); return; }

      let userId: string;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        userId = payload.sub;
      } catch (e) {
        setLoading(false);
        return;
      }

      if (!userId) { setLoading(false); return; }

      const headers = { Authorization: `Bearer ${token}` };
      const [followingRes, followersRes] = await Promise.all([
        fetch(`${API_URL}/users/${userId}/following`, { headers }),
        fetch(`${API_URL}/users/${userId}/followers`, { headers }),
      ]);

      const following = await followingRes.json();
      const followers = await followersRes.json();
      const followingIds = new Set(following.map((f: any) => f.following_id));
      const mutualFollowers = followers.filter((f: any) => followingIds.has(f.follower_id));

      if (mutualFollowers.length === 0) {
        setMutuals([]);
        setFiltered([]);
        return;
      }

      const mutualUsers = await Promise.all(
        mutualFollowers.map(async (f: any) => {
          try {
            const res = await fetch(`${API_URL}/users/id/${f.follower_id}`, { headers });
            return await res.json();
          } catch { return null; }
        })
      );

      const valid = mutualUsers.filter(Boolean);
      setMutuals(valid);
      setFiltered(valid);
    } catch (e) {
      console.log("Load mutuals error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setQuery(text);
    setFiltered(
      !text.trim()
        ? mutuals
        : mutuals.filter((u) => u.username.toLowerCase().includes(text.toLowerCase()))
    );
  };

  const handleSend = async (recipientId: string) => {
    setSending(recipientId);
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const convRes = await fetch(`${API_URL}/conversations/${recipientId}`, {
        method: "POST", headers,
      });
      if (!convRes.ok) throw new Error("Could not open conversation");
      const { conversation_id } = await convRes.json();

      const preview = post.content
        ? `"${post.content.slice(0, 80)}${post.content.length > 80 ? "..." : ""}"`
        : "a post";
      const messageText = `Shared ${preview} — ${API_URL}/posts/${post.id}`;

      const msgRes = await fetch(`${API_URL}/messages/${conversation_id}`, {
        method: "POST", headers, body: JSON.stringify({ content: messageText }),
      });
      if (!msgRes.ok) throw new Error("Failed to send");

      setSent((prev) => new Set(prev).add(recipientId));
    } catch (e) {
      Alert.alert("Error", "Could not send post. Try again.");
    } finally {
      setSending(null);
    }
  };

  const handleGoToMessages = () => {
    onClose();
    navigation.navigate("Messages");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={loadMutuals}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: theme.background }]}>
          <View style={[styles.handleBar, { backgroundColor: theme.card }]} />

          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: theme.card }]}
              onPress={handleGoToMessages}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={theme.text} />
              <Text style={[styles.backButtonText, { color: theme.text }]}>Messages</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Send Post</Text>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.card }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBox, { backgroundColor: theme.card }]}>
            <Ionicons name="search" size={16} color={theme.subtext} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search mutuals..."
              placeholderTextColor={theme.subtext}
              value={query}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />
          </View>

          {loading ? (
            <ActivityIndicator color={theme.text} style={{ marginTop: 24 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={40} color={theme.subtext} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: theme.subtext }]}>
                {query ? "No mutuals match your search" : "No mutual connections found"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => {
                const isSent = sent.has(item.id);
                const isSending = sending === item.id;
                return (
                  <View style={[styles.mutualRow, { borderBottomColor: theme.card }]}>
                    <View style={[styles.mutualAvatar, { backgroundColor: theme.card }]}>
                      {item.profile_pic ? (
                        <Image
                          source={{ uri: `${API_URL}${item.profile_pic}` }}
                          style={styles.mutualAvatarImg}
                        />
                      ) : (
                        <Text style={[styles.mutualInitial, { color: theme.text }]}>
                          {item.username[0].toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.mutualInfo}>
                      <Text style={[styles.mutualUsername, { color: theme.text }]}>
                        @{item.username}
                      </Text>
                      {item.full_name && (
                        <Text style={[styles.mutualFullName, { color: theme.subtext }]}>
                          {item.full_name}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.sendBtn,
                        { backgroundColor: isSent ? theme.card : "#6C63FF" },
                      ]}
                      onPress={() => !isSent && handleSend(item.id)}
                      disabled={isSending || isSent}
                    >
                      {isSending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.sendBtnText, { color: isSent ? theme.subtext : "#fff" }]}>
                          {isSent ? "Sent ✓" : "Send"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── POST CARD ─────────────────────────────────────────
function PostCard({ item, theme }: { item: any; theme: any }) {
  const [isLiked, setIsLiked] = useState(item.is_liked);
  const [likesCount, setLikesCount] = useState(item.likes_count);
  const [liking, setLiking] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    const token = await AsyncStorage.getItem("access_token");
    if (!token) return;
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount((c: number) => (wasLiked ? c - 1 : c + 1));
    setLiking(true);
    try {
      const res = await fetch(`${API_URL}/posts/${item.id}/like`, {
        method: wasLiked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setIsLiked(wasLiked);
        setLikesCount((c: number) => (wasLiked ? c + 1 : c - 1));
      }
    } catch {
      setIsLiked(wasLiked);
      setLikesCount((c: number) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setLiking(false);
    }
  };

  return (
    <View style={[styles.post, { borderColor: theme.card, backgroundColor: theme.card }]}>
      {/* HEADER */}
      <View style={styles.postHeader}>
        {item.profile_pic ? (
          <Image
            source={{ uri: item.profile_pic.startsWith("http") ? item.profile_pic : `${API_URL}${item.profile_pic}` }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.background }]}>
            <Ionicons name="person" size={16} color={theme.subtext} />
          </View>
        )}
        <View>
          <Text style={[styles.username, { color: theme.text }]}>@{item.username}</Text>
          {item.full_name && (
            <Text style={[styles.postFullName, { color: theme.subtext }]}>{item.full_name}</Text>
          )}
        </View>
      </View>

      {item.content ? (
        <Text style={[styles.content, { color: theme.text }]}>{item.content}</Text>
      ) : null}

      {item.image && (
        <Image
          source={{ uri: item.image.startsWith("http") ? item.image : `${API_URL}${item.image}` }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <TouchableOpacity style={styles.likeBtn} onPress={handleLike} disabled={liking} activeOpacity={1}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={22}
              color={isLiked ? "#e0245e" : theme.subtext}
            />
            <Text style={[styles.likeCount, { color: isLiked ? "#e0245e" : theme.subtext }]}>
              {likesCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.likeBtn} onPress={() => setShareVisible(true)} activeOpacity={0.7}>
            <Ionicons name="paper-plane-outline" size={21} color={theme.subtext} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.time, { color: theme.subtext }]}>
          {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
        </Text>
      </View>

      <ShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        post={item}
        theme={theme}
      />
    </View>
  );
}

// ─── PROFILE HEADER ────────────────────────────────────
function ProfileHeader({ theme }: { theme: any }) {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (!token) return;
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.sub;
        const res = await fetch(`${API_URL}/users/id/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setUser(await res.json());
      } catch (e) {
        console.log("Profile load error:", e);
      }
    };
    loadProfile();
  }, []);

  return (
    <View style={[styles.profileHeader, { borderBottomColor: theme.card }]}>
      <Text style={[styles.header, { color: theme.text }]}>Unifi</Text>
      {user ? (
        <TouchableOpacity
          style={styles.profileInfo}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.8}
        >
          <View style={styles.profileTextGroup}>
            <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>
              {user.full_name || user.username}
            </Text>
            <Text style={[styles.profileHandle, { color: theme.subtext }]} numberOfLines={1}>
              @{user.username}
            </Text>
          </View>
          {user.profile_pic ? (
            <Image
              source={{ uri: user.profile_pic.startsWith("http") ? user.profile_pic : `${API_URL}${user.profile_pic}` }}
              style={[styles.profileAvatar, { borderColor: theme.card }]}
            />
          ) : (
            <View style={[styles.profileAvatar, styles.profileAvatarFallback, { backgroundColor: theme.card, borderColor: theme.card }]}>
              <Text style={[styles.profileAvatarInitial, { color: theme.text }]}>
                {(user.full_name || user.username || "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.profileAvatarSkeleton} />
      )}
    </View>
  );
}

// ─── HOME SCREEN ───────────────────────────────────────
export default function Home() {
  const { theme } = useTheme();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = async () => {
    try {
      // ✅ FIX: Always send auth token so the backend knows who's viewing
      const token = await AsyncStorage.getItem("access_token");
      const headers: Record<string, string> = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const res = await fetch(`${API_URL}/feed`, { headers });
      const data = await res.json();
      const withLikes = await Promise.all(
        data.map(async (post: any) => {
          try {
            // ✅ FIX: Pass token here too so is_liked reflects the current user
            const likesRes = await fetch(`${API_URL}/posts/${post.id}/likes`, { headers });
            const likesData = await likesRes.json();
            return { ...post, likes_count: likesData.likes ?? 0, is_liked: likesData.is_liked ?? false };
          } catch {
            return { ...post, likes_count: 0, is_liked: false };
          }
        })
      );
      setPosts(withLikes);
    } catch (e) {
      console.log("Feed error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchFeed(); }, []));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ProfileHeader theme={theme} />
      {loading ? (
        <ActivityIndicator size="large" color={theme.text} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchFeed(); }}
              tintColor={theme.text}
            />
          }
          renderItem={({ item }) => <PostCard item={item} theme={theme} />}
          ListEmptyComponent={
            <View style={styles.emptyFeed}>
              <Ionicons name="newspaper-outline" size={48} color={theme.subtext} style={{ marginBottom: 12 }} />
              <Text style={[styles.empty, { color: theme.subtext }]}>No posts yet. Create one!</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },

  // ── Profile Header ──
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileTextGroup: {
    alignItems: "flex-end",
  },
  profileName: {
    fontSize: 13,
    fontWeight: "700",
    maxWidth: 120,
  },
  profileHandle: {
    fontSize: 11,
    maxWidth: 120,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
  },
  profileAvatarFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  profileAvatarInitial: {
    fontSize: 15,
    fontWeight: "800",
  },
  profileAvatarSkeleton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e0e0e0",
    opacity: 0.4,
  },

  // ── Post Card ──
  post: { borderWidth: 1, borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 12, marginTop: 12 },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { justifyContent: "center", alignItems: "center" },
  username: { fontWeight: "700", fontSize: 14 },
  postFullName: { fontSize: 12, marginTop: 1 },
  content: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  image: { width: "100%", height: 200, borderRadius: 8, marginBottom: 8 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  likeCount: { fontSize: 14, fontWeight: "600" },
  time: { fontSize: 11 },
  empty: { textAlign: "center", fontSize: 14 },
  emptyFeed: { alignItems: "center", marginTop: 60 },

  // ── Share Modal ──
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, minHeight: 300 },
  handleBar: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  mutualRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mutualAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  mutualAvatarImg: { width: 42, height: 42, borderRadius: 21 },
  mutualInitial: { fontSize: 16, fontWeight: "700" },
  mutualInfo: { flex: 1 },
  mutualUsername: { fontSize: 14, fontWeight: "600" },
  mutualFullName: { fontSize: 12, marginTop: 1 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  sendBtnText: { fontSize: 13, fontWeight: "600" },
  emptyContainer: { alignItems: "center", marginTop: 32 },
  emptyText: { textAlign: "center", fontSize: 14 },
});