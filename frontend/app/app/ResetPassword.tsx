import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native"
import React, { useState } from "react"
import { useRouter, useLocalSearchParams } from "expo-router"

const API_URL = "http://127.0.0.1:8000"

export default function ResetPasswordPage() {
  const router = useRouter()
  const { token } = useLocalSearchParams()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  // ✅ decode token to handle special characters from URL
  const cleanToken = decodeURIComponent(token as string)
  console.log("🟣 Token on reset page:", cleanToken)
  console.log("🟣 Token length:", cleanToken?.length)

  const handleReset = async () => {
    if (!newPassword || !confirmPassword)
      return Alert.alert("Error", "Please fill in both fields")

    if (newPassword !== confirmPassword)
      return Alert.alert("Error", "Passwords do not match")

    if (newPassword.length < 6)
      return Alert.alert("Error", "Password must be at least 6 characters")

    if (!cleanToken) {
      Alert.alert("Error", "Reset token is missing. Please try again.")
      return
    }

    setLoading(true)
    try {
      console.log("🔵 Sending reset request...")

      const formData = new FormData()
      formData.append("token", cleanToken)   // ✅ use decoded token
      formData.append("new_password", newPassword)

      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        body: formData,
      })

      const text = await response.text()
      console.log("🟡 Raw response:", text)
      console.log("🟡 Status:", response.status)

      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        Alert.alert("Error", "Server returned invalid response")
        return
      }

      if (!response.ok) {
        Alert.alert("Error", data.detail || "Reset failed")
        return
      }

      Alert.alert("✅ Success", "Password reset successfully! Please log in.", [
        { text: "OK", onPress: () => router.replace("/(tabs)") }
      ])

    } catch (error) {
      console.log("❌ Error:", error)
      Alert.alert("Error", "Could not connect to server")
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Unifi</Text>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your new password below</Text>

      <TextInput
        placeholder="New Password"
        style={styles.input}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        placeholder="Confirm Password"
        style={styles.input}
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Resetting..." : "Reset Password"}</Text>
      </TouchableOpacity>

      <Text style={styles.back} onPress={() => router.replace("/(tabs)")}>← Back to Login</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", alignItems: "center", paddingTop: 120 },
  logo: { color: "black", fontSize: 40, fontWeight: "bold", fontStyle: "italic", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  subtitle: { color: "#888", marginBottom: 30 },
  input: { width: "85%", padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginBottom: 14 },
  button: { backgroundColor: "#8ec5ff", width: "85%", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
  back: { color: "#40a6d8", marginTop: 24 },
})