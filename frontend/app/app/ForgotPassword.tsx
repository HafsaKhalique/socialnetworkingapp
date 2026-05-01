import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native"
import React, { useState } from "react"
import { useRouter } from "expo-router"

const API_URL = "http://127.0.0.1:8000"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [resetLink, setResetLink] = useState("")
  const [loading, setLoading] = useState(false)

  const handleForgotPassword = async () => {
    if (!email) return Alert.alert("Error", "Please enter your email")

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("email", email)

      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        Alert.alert("Error", data.detail || "Something went wrong")
        return
      }

      setResetLink(data.reset_link)
      Alert.alert("Success", "Reset link generated! Tap the button below to reset your password.")

    } catch (error) {
      Alert.alert("Error", "Could not connect to server")
    } finally {
      setLoading(false)
    }
  }

  const handleTapResetLink = () => {
    const tokenValue = resetLink.split("token=")[1] || ""
    console.log("🔵 Extracted token:", tokenValue)
    console.log("🔵 Token length:", tokenValue.length)

    if (!tokenValue) {
      Alert.alert("Error", "Could not extract token, please try again")
      return
    }

    // ✅ encode token so special characters survive the URL
    router.push(`/ResetPassword?token=${encodeURIComponent(tokenValue)}`)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Unifi</Text>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your NU email to get a reset link</Text>

      <TextInput
        placeholder="l123456@lhr.nu.edu.pk"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={handleForgotPassword} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Sending..." : "Get Reset Link"}</Text>
      </TouchableOpacity>

      {resetLink ? (
        <TouchableOpacity style={styles.linkButton} onPress={handleTapResetLink}>
          <Text style={styles.linkText}>→ Tap here to reset your password</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.back} onPress={() => router.back()}>← Back to Login</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", alignItems: "center", paddingTop: 120 },
  logo: { color: "black", fontSize: 40, fontWeight: "bold", fontStyle: "italic", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  subtitle: { color: "#888", marginBottom: 30, textAlign: "center", paddingHorizontal: 30 },
  input: { width: "85%", padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginBottom: 14 },
  button: { backgroundColor: "#8ec5ff", width: "85%", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "600" },
  linkButton: { marginTop: 20, padding: 12, backgroundColor: "#f0f8ff", borderRadius: 8, width: "85%", alignItems: "center" },
  linkText: { color: "#40a6d8", fontSize: 15, fontWeight: "600" },
  back: { color: "#40a6d8", marginTop: 24 },
})