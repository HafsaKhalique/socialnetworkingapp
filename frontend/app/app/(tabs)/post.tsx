import React, { useState } from "react";
import {
  View,
  TextInput,
  Image,
  Alert,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { decode as atob } from "base-64";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

const API_URL = "http://192.168.56.1:8000";

export default function PostScreen() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const [content, setContent] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);

  // ─── Derived theme colors ───────────────────────────────────────────────
  const colors = {
    screenBg:       theme.background      ?? (isDark ? "#0F0F0F" : "#FFFFFF"),
    headerBg:       theme.card            ?? (isDark ? "#1C1C1E" : "#FFFFFF"),
    separator:      theme.border          ?? (isDark ? "#2C2C2E" : "#E0E0E0"),
    primaryText:    theme.text            ?? (isDark ? "#FFFFFF" : "#111111"),
    secondaryText:  theme.textSecondary   ?? (isDark ? "#ABABAB" : "#555555"),
    placeholder:    theme.placeholder     ?? (isDark ? "#636366" : "#AAAAAA"),
    charCount:      theme.textSecondary   ?? (isDark ? "#636366" : "#BBBBBB"),
    accent:         theme.primary         ?? "#6C63FF",
    accentDisabled: theme.primaryMuted    ?? (isDark ? "#3D3A7A" : "#C5C2F5"),
    bodyBg:         theme.background      ?? (isDark ? "#0F0F0F" : "#FFFFFF"),
    toolbarBtnText: theme.primary         ?? "#6C63FF",
    iconColor:      theme.primary         ?? "#6C63FF",
  };
  // ────────────────────────────────────────────────────────────────────────

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0]);
    }
  };

  const removeImage = () => setImage(null);

  const createPost = async () => {
    if (!content.trim() && !image) {
      Alert.alert("Empty post", "Write something or pick an image first.");
      return;
    }
    const token = await AsyncStorage.getItem("access_token");
    if (!token) {
      Alert.alert("Not logged in", "Please log in first.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("content", content.trim() || " ");
      if (image) {
        if (Platform.OS === "web") {
          const response = await fetch(image.uri);
          const blob = await response.blob();
          const mimeType = blob.type || "image/jpeg";
          const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
          formData.append("file", blob, `post_image.${ext}`);
        } else {
          const ext = image.uri.split(".").pop() ?? "jpg";
          formData.append("file", {
            uri: image.uri,
            name: `post_image.${ext}`,
            type: `image/${ext === "jpg" ? "jpeg" : ext}`,
          } as any);
        }
      }
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = payload?.sub;
      if (!userId) {
        Alert.alert("Error", "User ID missing from token");
        return;
      }
      const res = await fetch(`${API_URL}/post-with-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        Alert.alert("Failed", JSON.stringify(data.detail) ?? "Something went wrong.");
        return;
      }
      const data = await res.json();
      console.log("✅ Post created:", data);
      Alert.alert("Posted! 🎉", "Your post is now live.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      setContent("");
      setImage(null);
    } catch (err) {
      console.error("Network error:", err);
      Alert.alert("Error", "Could not connect to server.");
    } finally {
      setUploading(false);
    }
  };

  const isDisabled = uploading || (!content.trim() && !image);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.screenBg }]} edges={["top", "bottom"]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.headerBg}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.separator }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: colors.secondaryText }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>New Post</Text>
        <TouchableOpacity
          style={[
            styles.postBtn,
            { backgroundColor: colors.accent },
            isDisabled && { backgroundColor: colors.accentDisabled },
          ]}
          onPress={createPost}
          disabled={isDisabled}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={[styles.container, { backgroundColor: colors.bodyBg }]}>
        <TextInput
          placeholder="What's on your mind?"
          placeholderTextColor={colors.placeholder}
          value={content}
          onChangeText={setContent}
          style={[styles.input, { color: colors.primaryText }]}
          multiline
          maxLength={500}
          selectionColor={colors.accent}
        />

        <Text style={[styles.charCount, { color: colors.charCount }]}>{content.length}/500</Text>

        {/* Image preview */}
        {image && (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: image.uri }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
              <Ionicons name="close-circle" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Toolbar */}
        <View style={[styles.toolbar, { borderTopColor: colors.separator }]}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={pickImage}>
            <Ionicons name="image-outline" size={24} color={colors.iconColor} />
            <Text style={[styles.toolbarBtnText, { color: colors.toolbarBtnText }]}>
              {image ? "Change Image" : "Add Image"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:           { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  cancelBtn:        { padding: 4 },
  cancelText:       { fontSize: 15 },
  headerTitle:      { fontSize: 16, fontWeight: "700" },
  postBtn:          { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, minWidth: 60, alignItems: "center" },
  postBtnText:      { color: "#fff", fontWeight: "700", fontSize: 14 },
  container:        { flex: 1, padding: 16 },
  input:            { fontSize: 16, lineHeight: 24, minHeight: 120, textAlignVertical: "top" },
  charCount:        { alignSelf: "flex-end", fontSize: 12, marginBottom: 12 },
  imageWrapper:     { position: "relative", marginBottom: 12, borderRadius: 12, overflow: "hidden" },
  imagePreview:     { width: "100%", height: 220, borderRadius: 12 },
  removeImageBtn:   { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 13 },
  toolbar:          { flexDirection: "row", borderTopWidth: 0.5, paddingTop: 12, marginTop: "auto" },
  toolbarBtn:       { flexDirection: "row", alignItems: "center", gap: 6, padding: 4 },
  toolbarBtnText:   { fontSize: 14, fontWeight: "600" },
});