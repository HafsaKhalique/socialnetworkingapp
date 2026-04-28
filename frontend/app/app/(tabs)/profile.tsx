import { useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Image,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { decode as atob } from "base-64";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "../../context/ThemeContext";

const API_URL = "http://127.0.0.1:8000";

const { width } = Dimensions.get("window");
const TILE_SIZE = (width - 3) / 3;

type PostImage = {
  id: string;
  image_url: string;
};

type Post = {
  id: string;
  content?: string;
  created_at?: string;
  images?: PostImage[];
};

type User = {
  id: string;
  username: string;
  email?: string; // ✅ added
  full_name?: string;
  bio?: string;
  profile_pic?: string;
  department?: string;
  university?: string;
};

function decodeToken(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    console.log("❌ Token decode failed:", e);
    return null;
  }
}

export default function ProfileScreen({ navigation }: any) {
  const router = useRouter();
  const { theme, mode } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (!token) return;

      const payload = decodeToken(token);
      const userId = payload?.sub;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const userRes = await fetch(`${API_URL}/users/id/${userId}`, { headers });
      const userData: User = await userRes.json();
      setUser(userData);

      const postsRes = await fetch(`${API_URL}/users/${userId}/posts`, { headers });
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(Array.isArray(data) ? data : []);
      }

      const [f1, f2] = await Promise.all([
        fetch(`${API_URL}/users/${userData.id}/followers`, { headers }),
        fetch(`${API_URL}/users/${userData.id}/following`, { headers }),
      ]);

      if (f1.ok) setFollowers(await f1.json());
      if (f2.ok) setFollowing(await f2.json());
    } catch (err) {
      console.log("❌ ERROR:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  function PostTile({ post }: { post: Post }) {
    const firstImage = post.images?.[0]?.image_url;

    return (
      <View style={[styles.tile, { backgroundColor: theme.card }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.8}>
          {firstImage ? (
            <Image
              source={{ uri: `${API_URL}${firstImage}` }}
              style={styles.tileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.tileFallback}>
              <Text numberOfLines={4} style={{ color: theme.text }}>
                {post.content || ""}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tileOptionsBtn}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/edit-post",
              params: {
                postId: post.id,
                currentContent: post.content ?? "",
                currentImage: post.images?.[0]?.image_url ?? "",
              },
            })
          }
        >
          <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  function StatCol({ count, label }: { count: number; label: string }) {
    return (
      <View style={styles.statCol}>
        <Text style={[styles.statNumber, { color: theme.text }]}>{count}</Text>
        <Text style={{ color: theme.text }}>{label}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
        <Text style={{ marginTop: 10, color: theme.text }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const ProfileHeader = () => (
    <View>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBarLeft}
          onPress={() => setShowDropdown(!showDropdown)}
          activeOpacity={0.7}
        >
          <Ionicons name="lock-closed" size={13} color={theme.text} />
          <Text style={[styles.topUsername, { color: theme.text }]}>
            {user?.username ?? ""}
          </Text>
          <Ionicons
            name={showDropdown ? "chevron-up" : "chevron-down"}
            size={13}
            color={theme.text}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/menu")}>
          <Ionicons name="menu" size={26} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* ── Dropdown card ── */}
      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: theme.card, borderColor: theme.text + "22" },
          ]}
        >
          {/* Avatar + Full Name + Username */}
          <View style={styles.dropdownRow}>
            {user?.profile_pic ? (
              <Image
                source={{ uri: `${API_URL}${user.profile_pic}` }}
                style={styles.dropdownAvatar}
              />
            ) : (
              <View
                style={[
                  styles.dropdownAvatar,
                  { backgroundColor: "#eee", justifyContent: "center", alignItems: "center" },
                ]}
              >
                <Ionicons name="person" size={22} color="#999" />
              </View>
            )}
            <View style={{ marginLeft: 12, flex: 1 }}>
              {user?.full_name && (
                <Text style={[styles.dropdownFullName, { color: theme.text }]}>
                  {user.full_name}
                </Text>
              )}
              <Text style={[styles.dropdownUsername, { color: theme.text + "99" }]}>
                @{user?.username}
              </Text>
            </View>
          </View>

          <View style={styles.dropdownDivider} />

          {/* Email */}
          {user?.email && (
            <View style={styles.dropdownItem}>
              <Ionicons name="mail-outline" size={15} color={theme.text + "99"} />
              <Text style={[styles.dropdownText, { color: theme.text }]}>
                {user.email}
              </Text>
            </View>
          )}

          {/* Department / University */}
          {(user?.department || user?.university) && (
            <View style={styles.dropdownItem}>
              <Ionicons name="school-outline" size={15} color={theme.text + "99"} />
              <Text style={[styles.dropdownText, { color: theme.text }]}>
                {[user.department, user.university].filter(Boolean).join(" · ")}
              </Text>
            </View>
          )}

          {/* Bio */}
          {user?.bio && (
            <View style={styles.dropdownItem}>
              <Ionicons name="information-circle-outline" size={15} color={theme.text + "99"} />
              <Text style={[styles.dropdownText, { color: theme.text }]}>
                {user.bio}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.avatarStatsRow}>
        <View style={styles.avatarWrapper}>
          {user?.profile_pic ? (
            <Image
              source={{ uri: `${API_URL}${user.profile_pic}` }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: "#eee", justifyContent: "center", alignItems: "center" },
              ]}
            >
              <Ionicons name="person" size={50} color="#999" />
            </View>
          )}
        </View>
        <View style={styles.statsRow}>
          <StatCol count={posts.length} label="Posts" />
          <StatCol count={followers.length} label="Followers" />
          <StatCol count={following.length} label="Following" />
        </View>
      </View>

      <View style={styles.bioSection}>
        {user?.full_name && (
          <Text style={[styles.fullName, { color: theme.text }]}>{user.full_name}</Text>
        )}
        {(user?.department || user?.university) && (
          <Text style={{ color: theme.text }}>
            {[user.department, user.university].filter(Boolean).join(" · ")}
          </Text>
        )}
        {user?.bio && <Text style={{ color: theme.text }}>{user.bio}</Text>}
      </View>

      <StatusBar barStyle={mode === "dark" ? "light-content" : "dark-content"} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => <PostTile post={item} />}
        ListHeaderComponent={<ProfileHeader />}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.text}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topUsername: {
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 4,
  },
  avatarStatsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 10,
  },
  avatarWrapper: { marginRight: 20 },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statCol: { alignItems: "center" },
  statNumber: { fontSize: 16, fontWeight: "700" },
  bioSection: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  fullName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  editBtnWrapper: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  editBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  row: { gap: 1.5 },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  tileImage: {
    width: "100%",
    height: "100%",
  },
  tileFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tileOptionsBtn: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    padding: 3,
  },
  dropdown: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dropdownAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  dropdownFullName: {
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 2,
  },
  dropdownUsername: {
    fontSize: 13,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 13,
    flex: 1,
  },
  dropdownDivider: {
    height: 0.5,
    backgroundColor: "#00000022",
    marginBottom: 10,
  },
  dropdownStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  dropdownStat: {
    alignItems: "center",
  },
});