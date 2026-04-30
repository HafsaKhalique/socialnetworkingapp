import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Animated,
  Pressable,
  StatusBar,
  ScrollView,
  Clipboard,
} from "react-native";
import { useTheme } from "../../../context/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { decode as atob } from "base-64";

const API_URL = "http://10.104.114.50:8000";

const EMOJI_LIST = [
  "😀","😂","🥰","😍","🤩","😎","🥳","😭","😤","🤔",
  "👍","👎","❤️","🔥","💯","🎉","✨","😅","🙏","💪",
  "😊","🤣","😢","😡","🤯","💀","👀","🫶","😏","🥺",
  "🌟","💬","🚀","🎯","💡","⚡","🌈","🍕","🎮","📱",
];

function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return String(payload.sub);
  } catch {
    return null;
  }
}

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";

  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0] : params.conversationId;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const otherUserId = Array.isArray(params.otherUserId)
    ? params.otherUserId[0] : params.otherUserId;

  const currentUserId = token ? getUserIdFromToken(token) : null;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollBtnOpacity = useRef(new Animated.Value(0)).current;
  const scrollBtnScale = useRef(new Animated.Value(0.7)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const sheetBgAnim = useRef(new Animated.Value(0)).current;
  const [toast, setToast] = useState("");
  const toastAnim = useRef(new Animated.Value(0)).current;

  const paramsReady =
    conversationId && conversationId !== "undefined" &&
    token && token !== "undefined";

  // ─── Derived theme colors ─────────────────────────────────────────────────
  const colors = {
    // Backgrounds
    screenBg:       theme.background       ?? (isDark ? "#0F0F0F" : "#F6F6F6"),
    headerBg:       theme.card             ?? (isDark ? "#1C1C1E" : "#FFFFFF"),
    inputBarBg:     theme.card             ?? (isDark ? "#1C1C1E" : "#FFFFFF"),
    sheetBg:        theme.card             ?? (isDark ? "#1C1C1E" : "#FFFFFF"),
    inputPillBg:    theme.inputBackground  ?? (isDark ? "#2C2C2E" : "#F2F2F7"),
    editInputBg:    theme.inputBackground  ?? (isDark ? "#2C2C2E" : "#F2F2F7"),
    previewBg:      theme.surface          ?? (isDark ? "#2C2C2E" : "#F7F7F9"),
    cancelBtnBg:    theme.inputBackground  ?? (isDark ? "#2C2C2E" : "#F2F2F7"),
    emojiPickerBg:  theme.card             ?? (isDark ? "#1C1C1E" : "#FFFFFF"),
    skeletonBg:     theme.border           ?? (isDark ? "#3A3A3C" : "#EBEBEB"),

    // Text
    primaryText:    theme.text             ?? (isDark ? "#FFFFFF" : "#0A0A0A"),
    secondaryText:  theme.textSecondary    ?? (isDark ? "#ABABAB" : "#888888"),
    placeholderText:theme.placeholder      ?? (isDark ? "#636366" : "#B0B0B0"),
    cancelTxt:      theme.textSecondary    ?? (isDark ? "#ABABAB" : "#555555"),
    previewTxt:     theme.text             ?? (isDark ? "#DDDDDD" : "#333333"),

    // Borders / separators
    separator:      theme.border           ?? (isDark ? "#2C2C2E" : "#EBEBEB"),

    // Accent / brand
    accent:         theme.primary          ?? "#007AFF",
    danger:         theme.error            ?? "#FF3B30",

    // Bubbles
    bubbleMeBg:     theme.primary          ?? "#007AFF",
    bubbleOtherBg:  theme.card             ?? (isDark ? "#2C2C2E" : "#FFFFFF"),
    bubbleMeText:   "#FFFFFF",
    bubbleOtherText:theme.text             ?? (isDark ? "#FFFFFF" : "#111111"),
    bubbleMetaMe:   "rgba(255,255,255,0.6)",
    bubbleMetaOther:theme.textSecondary    ?? (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"),
    editedMe:       "rgba(255,255,255,0.5)",
    editedOther:    theme.textSecondary    ?? (isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)"),

    // Toast
    toastBg:        isDark ? "rgba(255,255,255,0.15)" : "rgba(20,20,20,0.78)",
    toastText:      "#FFFFFF",

    // Tile icon backgrounds
    tileIconCopy:   isDark ? "#0A2A3A" : "#F0F9FF",
    tileIconEdit:   isDark ? "#0A1A3A" : "#EEF4FF",
    tileIconDelete: isDark ? "#3A0A0A" : "#FFF1F0",
    tileIconCopyClr:"#0EA5E9",
    tileIconEditClr:theme.primary ?? "#007AFF",
    tileIconDelClr: theme.error   ?? "#FF3B30",
  };
  // ─────────────────────────────────────────────────────────────────────────

  const showToast = (msg: string) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const showScrollButton = () => {
    setShowScrollBtn(true);
    Animated.parallel([
      Animated.spring(scrollBtnOpacity, { toValue: 1, useNativeDriver: true, speed: 22 }),
      Animated.spring(scrollBtnScale, { toValue: 1, useNativeDriver: true, speed: 22 }),
    ]).start();
  };
  const hideScrollButton = () => {
    Animated.parallel([
      Animated.timing(scrollBtnOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(scrollBtnScale, { toValue: 0.7, duration: 180, useNativeDriver: true }),
    ]).start(() => { setShowScrollBtn(false); setUnreadCount(0); });
  };
  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const dist = contentSize.height - contentOffset.y - layoutMeasurement.height;
    if (dist > 140) showScrollButton();
    else { hideScrollButton(); setUnreadCount(0); }
  };
  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
    hideScrollButton();
  };

  const openSheet = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 3 }),
      Animated.timing(sheetBgAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };
  const closeSheet = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetBgAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { setMenuVisible(false); setSelectedMsg(null); cb?.(); });
  };

  useEffect(() => {
    if (!otherUserId || !token) return;
    fetch(`${API_URL}/users/id/${otherUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.ok ? r.json() : null).then(d => d && setOtherUser(d)).catch(() => {});
  }, [otherUserId, token]);

  useEffect(() => {
    if (!paramsReady) { setLoading(false); setError("Missing conversation info."); return; }
    fetchMessages();
    const iv = setInterval(fetchMessages, 2500);
    return () => clearInterval(iv);
  }, [paramsReady]);

  useEffect(() => {
    if (!messages.length) return;
    if (!showScrollBtn) setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    else setUnreadCount(c => c + 1);
  }, [messages.length]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.map((m: any) => ({
        id: m.id,
        text: m.content,
        sender: String(m.sender_id) === String(currentUserId) ? "me" : "other",
        created_at: m.created_at,
        edited: m.edited ?? false,
      })));
    } catch {} finally { setLoading(false); }
  };

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed || !paramsReady) return;
    setMessage("");
    setShowEmoji(false);
    try {
      const res = await fetch(`${API_URL}/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) fetchMessages();
    } catch {}
  };

  const handleLongPress = (item: any) => {
    setSelectedMsg(item);
    openSheet();
  };

  const handleDelete = () => {
    const target = selectedMsg;
    closeSheet(() => setTimeout(() => {
      Alert.alert("Delete Message", "This will permanently delete the message.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/messages/${target.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) { setMessages(p => p.filter(m => m.id !== target.id)); showToast("Message deleted"); }
              else Alert.alert("Error", "Could not delete message.");
            } catch { Alert.alert("Error", "Network error."); }
          },
        },
      ]);
    }, 250));
  };

  const handleEdit = () => {
    const target = selectedMsg;
    closeSheet(() => setTimeout(() => {
      setEditingMsgId(target.id);
      setEditText(target.text);
    }, 200));
  };

  const submitEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || !editingMsgId) return;
    const id = editingMsgId;
    setEditingMsgId(null);
    setEditText("");
    try {
      const res = await fetch(`${API_URL}/messages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        setMessages(p => p.map(m => m.id === id ? { ...m, text: trimmed, edited: true } : m));
        showToast("Message updated ✓");
      } else Alert.alert("Error", "Could not edit message.");
    } catch { Alert.alert("Error", "Network error."); }
  };

  const cancelEdit = () => { setEditingMsgId(null); setEditText(""); };

  const handleCopy = () => {
    const text = selectedMsg?.text;
    closeSheet(() => { if (text) { Clipboard.setString(text); showToast("Copied!"); } });
  };

  const insertEmoji = (emoji: string) => setMessage(p => p + emoji);

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.sender === "me";
    const isEditing = editingMsgId === item.id;

    return (
      <Pressable onLongPress={() => handleLongPress(item)} delayLongPress={300}>
        {({ pressed }) => (
          <View style={[
            styles.bubbleRow,
            isMe ? styles.rowMe : styles.rowOther,
            { opacity: pressed ? 0.75 : 1 },
          ]}>
            {!isMe && (
              <View style={styles.avatarSmallWrap}>
                {otherUser?.profile_pic ? (
                  <Image
                    source={{ uri: otherUser.profile_pic.startsWith("http")
                      ? otherUser.profile_pic : `${API_URL}${otherUser.profile_pic}` }}
                    style={styles.avatarSmall}
                  />
                ) : (
                  <View style={[styles.avatarSmall, { backgroundColor: colors.accent, justifyContent: "center", alignItems: "center" }]}>
                    <Text style={styles.avatarInitial}>
                      {(otherUser?.full_name || otherUser?.username || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={[
              styles.bubble,
              isMe
                ? [styles.bubbleMe, { backgroundColor: colors.bubbleMeBg }]
                : [styles.bubbleOther, { backgroundColor: colors.bubbleOtherBg }],
              isEditing && [styles.bubbleEditing, { backgroundColor: colors.headerBg, borderColor: colors.accent }],
            ]}>
              {isEditing ? (
                <View style={styles.editWrap}>
                  <View style={styles.editHeader}>
                    <Ionicons name="pencil" size={12} color={colors.accent} />
                    <Text style={[styles.editHeaderTxt, { color: colors.accent }]}>Editing</Text>
                  </View>
                  <TextInput
                    style={[styles.editInput, { color: colors.primaryText, backgroundColor: colors.editInputBg }]}
                    value={editText}
                    onChangeText={setEditText}
                    autoFocus
                    multiline
                    selectionColor={colors.accent}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={cancelEdit} style={styles.editCancelBtn}>
                      <Text style={[styles.editCancelTxt, { color: colors.secondaryText }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={submitEdit}
                      style={[styles.editSaveBtn, { backgroundColor: colors.accent }, !editText.trim() && { opacity: 0.4 }]}
                      disabled={!editText.trim()}
                    >
                      <Text style={styles.editSaveTxt}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={{ color: isMe ? colors.bubbleMeText : colors.bubbleOtherText, fontSize: 15.5, lineHeight: 21 }}>
                    {item.text}
                  </Text>
                  <View style={styles.metaRow}>
                    {item.edited && (
                      <Text style={{ color: isMe ? colors.editedMe : colors.editedOther, fontSize: 10, fontStyle: "italic" }}>
                        edited
                      </Text>
                    )}
                    {item.created_at && (
                      <Text style={{ color: isMe ? colors.bubbleMetaMe : colors.bubbleMetaOther, fontSize: 11 }}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  if (error) return (
    <View style={[styles.centered, { backgroundColor: colors.screenBg }]}>
      <Text style={{ color: colors.danger, textAlign: "center", padding: 20 }}>{error}</Text>
    </View>
  );
  if (loading) return (
    <View style={[styles.centered, { backgroundColor: colors.screenBg }]}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );

  const sheetTranslateY = sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [340, 0] });
  const isOwnMsg = selectedMsg?.sender === "me";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.headerBg}
      />
      <View style={[styles.container, { backgroundColor: colors.screenBg }]}>

        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.separator }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.accent} />
          </TouchableOpacity>
          {otherUser ? (
            <TouchableOpacity activeOpacity={0.75} style={styles.headerCenter}>
              <View style={styles.avatarWrapper}>
                {otherUser.profile_pic ? (
                  <Image
                    source={{ uri: otherUser.profile_pic.startsWith("http")
                      ? otherUser.profile_pic : `${API_URL}${otherUser.profile_pic}` }}
                    style={styles.headerAvatar}
                  />
                ) : (
                  <View style={[styles.headerAvatarFallback, { backgroundColor: colors.accent }]}>
                    <Text style={styles.headerAvatarInitial}>
                      {(otherUser.full_name || otherUser.username || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.onlineDot} />
              </View>
              <View>
                <Text style={[styles.headerName, { color: colors.primaryText }]} numberOfLines={1}>
                  {otherUser.full_name || otherUser.username}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerCenter}>
              <View style={[styles.headerAvatarFallback, { backgroundColor: colors.skeletonBg }]} />
              <View>
                <View style={[styles.skeletonName, { backgroundColor: colors.skeletonBg }]} />
                <View style={[styles.skeletonHandle, { backgroundColor: colors.skeletonBg }]} />
              </View>
            </View>
          )}
        </View>

        {/* MESSAGES */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 14, paddingBottom: 8 }}
          onContentSizeChange={() => !showScrollBtn && flatListRef.current?.scrollToEnd({ animated: false })}
          onScroll={handleScroll}
          scrollEventThrottle={28}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* SCROLL FAB */}
        {showScrollBtn && (
          <Animated.View style={[styles.scrollFab, { opacity: scrollBtnOpacity, transform: [{ scale: scrollBtnScale }] }]}>
            <TouchableOpacity onPress={scrollToBottom} activeOpacity={0.8} style={styles.scrollFabInner}>
              {unreadCount > 0 && (
                <View style={[styles.unreadPill, { backgroundColor: colors.danger }]}>
                  <Text style={styles.unreadPillTxt}>{unreadCount > 99 ? "99+" : unreadCount} new</Text>
                </View>
              )}
              <View style={[styles.scrollFabIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="chevron-down" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* EMOJI PICKER */}
        {showEmoji && (
          <View style={[styles.emojiPicker, { backgroundColor: colors.emojiPickerBg, borderTopColor: colors.separator }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
              {EMOJI_LIST.map(e => (
                <TouchableOpacity key={e} onPress={() => insertEmoji(e)} style={styles.emojiItem}>
                  <Text style={styles.emojiChar}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* INPUT BAR */}
        <View style={[styles.inputBar, { backgroundColor: colors.inputBarBg, borderTopColor: colors.separator }]}>
          <View style={[styles.inputPill, { backgroundColor: colors.inputPillBg }]}>
            <TextInput
              style={[styles.input, { color: colors.primaryText }]}
              placeholder="Message…"
              placeholderTextColor={colors.placeholderText}
              value={message}
              onChangeText={setMessage}
              multiline
              blurOnSubmit={false}
              selectionColor={colors.accent}
              onFocus={() => setShowEmoji(false)}
            />
            <TouchableOpacity style={styles.emojiToggleBtn} onPress={() => setShowEmoji(v => !v)}>
              <Ionicons
                name={showEmoji ? "happy" : "happy-outline"}
                size={22}
                color={showEmoji ? colors.accent : colors.placeholderText}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={sendMessage}
            style={[styles.sendBtn, { backgroundColor: colors.accent }, !message.trim() && { opacity: 0.4 }]}
            disabled={!message.trim()}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* TOAST */}
      <Animated.View style={[styles.toast, { opacity: toastAnim, backgroundColor: colors.toastBg }]} pointerEvents="none">
        <Text style={[styles.toastTxt, { color: colors.toastText }]}>{toast}</Text>
      </Animated.View>

      {/* ACTION SHEET */}
      <Modal visible={menuVisible} transparent animationType="none" statusBarTranslucent onRequestClose={() => closeSheet()}>
        <TouchableWithoutFeedback onPress={() => closeSheet()}>
          <Animated.View style={[styles.overlay, { opacity: sheetBgAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.sheet, { backgroundColor: colors.sheetBg, transform: [{ translateY: sheetTranslateY }] }]}>
                <View style={[styles.sheetHandle, { backgroundColor: colors.separator }]} />
                {selectedMsg && (
                  <View style={[styles.preview, { backgroundColor: colors.previewBg }]}>
                    <View style={[styles.previewAccent, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.previewTxt, { color: colors.previewTxt }]} numberOfLines={2}>
                      {selectedMsg.text}
                    </Text>
                  </View>
                )}
                <View style={styles.tilesRow}>
                  {/* COPY — everyone */}
                  <TouchableOpacity style={styles.tile} onPress={handleCopy}>
                    <View style={[styles.tileIcon, { backgroundColor: colors.tileIconCopy }]}>
                      <Ionicons name="copy-outline" size={22} color={colors.tileIconCopyClr} />
                    </View>
                    <Text style={[styles.tileLabel, { color: colors.primaryText }]}>Copy</Text>
                  </TouchableOpacity>

                  {/* EDIT — own only */}
                  {isOwnMsg && (
                    <TouchableOpacity style={styles.tile} onPress={handleEdit}>
                      <View style={[styles.tileIcon, { backgroundColor: colors.tileIconEdit }]}>
                        <Ionicons name="pencil" size={22} color={colors.tileIconEditClr} />
                      </View>
                      <Text style={[styles.tileLabel, { color: colors.primaryText }]}>Edit</Text>
                    </TouchableOpacity>
                  )}

                  {/* DELETE — own only */}
                  {isOwnMsg && (
                    <TouchableOpacity style={styles.tile} onPress={handleDelete}>
                      <View style={[styles.tileIcon, { backgroundColor: colors.tileIconDelete }]}>
                        <Ionicons name="trash-outline" size={22} color={colors.tileIconDelClr} />
                      </View>
                      <Text style={[styles.tileLabel, { color: colors.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.cancelBtnBg }]} onPress={() => closeSheet()}>
                  <Text style={[styles.cancelTxt, { color: colors.cancelTxt }]}>Cancel</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  centered:           { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 18, paddingBottom: 12,
    paddingHorizontal: 8, gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 3,
  },
  backBtn:             { padding: 6 },
  headerCenter:        { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 2 },
  avatarWrapper:       { position: "relative" },
  headerAvatar:        { width: 42, height: 42, borderRadius: 21 },
  headerAvatarFallback:{ width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  headerAvatarInitial: { color: "#fff", fontSize: 17, fontWeight: "700" },
  onlineDot:           {},
  headerName:          { fontSize: 15, fontWeight: "700", maxWidth: 170 },
  headerBtn:           { padding: 8 },
  skeletonName:        { width: 100, height: 12, borderRadius: 6, marginBottom: 5 },
  skeletonHandle:      { width: 70, height: 10, borderRadius: 5 },
  bubbleRow:           { flexDirection: "row", alignItems: "flex-end", marginVertical: 3 },
  rowMe:               { justifyContent: "flex-end" },
  rowOther:            { justifyContent: "flex-start", gap: 7 },
  avatarSmallWrap:     { width: 30, alignItems: "center" },
  avatarSmall:         { width: 27, height: 27, borderRadius: 14 },
  avatarInitial:       { color: "#fff", fontSize: 11, fontWeight: "700" },
  bubble:              { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, borderRadius: 22, maxWidth: "77%" },
  bubbleMe:            { borderBottomRightRadius: 5, shadowColor: "#007AFF", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 7, elevation: 4 },
  bubbleOther:         { borderBottomLeftRadius: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 1 },
  bubbleEditing:       { minWidth: 220, borderWidth: 1.5 },
  metaRow:             { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5, justifyContent: "flex-end" },
  editWrap:            { minWidth: 210 },
  editHeader:          { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  editHeaderTxt:       { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  editInput:           { fontSize: 15.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minHeight: 42, maxHeight: 120 },
  editActions:         { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10 },
  editCancelBtn:       { paddingHorizontal: 12, paddingVertical: 6 },
  editCancelTxt:       { fontSize: 14, fontWeight: "600" },
  editSaveBtn:         { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 6 },
  editSaveTxt:         { color: "#fff", fontSize: 14, fontWeight: "700" },
  scrollFab:           { position: "absolute", bottom: 88, right: 16, zIndex: 99, alignItems: "center" },
  scrollFabInner:      { alignItems: "center" },
  unreadPill:          { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },
  unreadPillTxt:       { color: "#fff", fontSize: 11, fontWeight: "800" },
  scrollFabIcon:       { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.38, shadowRadius: 10, elevation: 8 },
  emojiPicker:         { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  emojiRow:            { paddingHorizontal: 10, gap: 2 },
  emojiItem:           { padding: 6 },
  emojiChar:           { fontSize: 26 },
  inputBar:            { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 8, paddingVertical: 10, paddingBottom: Platform.OS === "ios" ? 28 : 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  inputPill:           { flex: 1, flexDirection: "row", alignItems: "flex-end", borderRadius: 24, paddingHorizontal: 14, minHeight: 42 },
  input:               { flex: 1, fontSize: 15.5, paddingVertical: 10, maxHeight: 110 },
  emojiToggleBtn:      { paddingBottom: 10, paddingLeft: 6 },
  sendBtn:             { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.32, shadowRadius: 7, elevation: 5, marginBottom: 1 },
  toast:               { position: "absolute", bottom: 96, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, zIndex: 999 },
  toastTxt:            { fontSize: 13.5, fontWeight: "600" },
  overlay:             { flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" },
  sheet:               { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 44 : 28 },
  sheetHandle:         { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  preview:             { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, padding: 14, marginBottom: 20 },
  previewAccent:       { width: 3, borderRadius: 2, marginTop: 2, alignSelf: "stretch" },
  previewTxt:          { flex: 1, fontSize: 14.5, lineHeight: 20 },
  tilesRow:            { flexDirection: "row", gap: 12, marginBottom: 18 },
  tile:                { flex: 1, alignItems: "center", gap: 7 },
  tileIcon:            { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tileLabel:           { fontSize: 12.5, fontWeight: "600" },
  cancelBtn:           { borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  cancelTxt:           { fontSize: 16, fontWeight: "600" },
});