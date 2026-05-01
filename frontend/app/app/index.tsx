import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import { useRouter } from "expo-router";

const API_URL = "http://127.0.0.1:8000";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      console.log("🔵 Logging in...");

      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);

      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        body: formData,
      });

      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        alert("Server did not return JSON");
        return;
      }

      if (!response.ok) {
        alert(data.detail || "Login failed");
        return;
      }

      await AsyncStorage.setItem("access_token", data.access_token);
      await AsyncStorage.setItem("refresh_token", data.refresh_token);

      console.log("✅ Login success");
      router.replace("/profile");

    } catch (error) {
      console.log("❌ Error:", error);
      alert("Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Unifi</Text>

      <TextInput
        placeholder="Username"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.forgotWrapper}>
        <Text style={styles.forgot} onPress={() => router.push("/ForgotPassword")}>
          Forgot password?
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log in</Text>
      </TouchableOpacity>

      <View style={styles.orWrapper}>
        <View style={styles.line} />
        <Text style={styles.or}>OR</Text>
        <View style={styles.line} />
      </View>

      <Text style={styles.signup}>
        Don't have an account?{" "}
        <Text style={{ color: "#40a6d8" }} onPress={() => router.push("/signup")}>
          Sign up.
        </Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    paddingTop: 120,
  },
  logo: {
    color: "black",
    fontSize: 40,
    fontWeight: "bold",
    fontStyle: "italic",
    marginBottom: 50,
  },
  input: {
    width: "85%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
  },
  forgotWrapper: {
    width: "85%",
    alignItems: "flex-end",
    marginBottom: 10,
    marginTop: -2,
  },
  forgot: {
    color: "#40a6d8",
  },
  button: {
    backgroundColor: "#8ec5ff",
    width: "85%",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  orWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "85%",
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  or: {
    color: "#888",
    marginHorizontal: 12,
    fontSize: 13,
  },
  signup: {
    color: "#555",
  },
})