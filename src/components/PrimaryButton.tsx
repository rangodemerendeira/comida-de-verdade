import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Colors } from "../theme/colors";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({ title, onPress, loading, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      style={[
        {
          backgroundColor: Colors.textPrimary,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          opacity: loading ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.background} />
      ) : (
        <Text style={{ color: Colors.background, fontSize: 16, fontFamily: "InterMedium" }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
