import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../lib/theme";
import { GlassCard } from "./GlassCard";

export type ServicePickerService = {
  id: string;
  name: string;
  slug?: string | null;
  logo_url?: string | null; // if/when you add it
};

export function ServicePicker(props: {
  visible: boolean;
  services: ServicePickerService[];
  onSelect: (service: ServicePickerService) => void;
  onClose: () => void;
  title?: string;
}) {
  const { visible, services, onSelect, onClose, title } = props;

  const data = useMemo(() => services ?? [], [services]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "flex-end",
        }}
      >
        {/* Sheet */}
        <Pressable
          onPress={() => {}}
          style={{
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            backgroundColor: THEME.bgSolid,
            paddingBottom: Platform.OS === "ios" ? 18 : 12,
            maxHeight: "82%",
            borderWidth: 1,
            borderColor: THEME.borderSoft,
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: THEME.pagePad ?? 18,
              paddingTop: 10,
              paddingBottom: 10,
            }}
          >
            {/* Handle */}
            <View
              style={{
                alignSelf: "center",
                width: 44,
                height: 5,
                borderRadius: 99,
                backgroundColor: "rgba(255,255,255,0.18)",
                marginBottom: 10,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: THEME.text, fontSize: 16, fontWeight: "900" }}>
                  {title ?? "Choose a service"}
                </Text>
                <Text style={{ color: THEME.textMuted, marginTop: 2, fontSize: 12 }}>
                  {data.length} available
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={{
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: THEME.borderSoft,
                }}
              >
                <Ionicons name="close" size={18} color={THEME.text} />
              </Pressable>
            </View>
          </View>

          {/* List */}
          <FlatList
            data={data}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{
              paddingHorizontal: THEME.pagePad ?? 18,
              paddingBottom: 16,
              gap: 10,
            }}
            renderItem={({ item }) => {
              return (
                <Pressable
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <GlassCard
                    style={{
                      padding: 14,
                      borderRadius: THEME.r.md,
                      borderWidth: 1,
                      borderColor: THEME.borderSoft,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {/* Logo */}
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: "rgba(255,255,255,0.06)",
                          borderWidth: 1,
                          borderColor: THEME.borderSoft,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                          overflow: "hidden",
                        }}
                      >
                        {item.logo_url ? (
                          <Image
                            source={{ uri: item.logo_url }}
                            style={{ width: 36, height: 36, resizeMode: "contain" }}
                          />
                        ) : (
                          <Ionicons name="play" size={18} color={THEME.textDim} />
                        )}
                      </View>

                      {/* Text */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: THEME.text, fontSize: 16, fontWeight: "900" }}>
                          {item.name}
                        </Text>
                        {item.slug ? (
                          <Text style={{ marginTop: 2, color: THEME.textMuted, fontSize: 12 }}>
                            {item.slug}
                          </Text>
                        ) : null}
                      </View>

                      <Ionicons name="chevron-forward" size={18} color={THEME.textDim} />
                    </View>
                  </GlassCard>
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default ServicePicker;
