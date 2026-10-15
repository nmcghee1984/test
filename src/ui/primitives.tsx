import { createContext, useContext } from "react";
import { Pressable as NativePressable, Text as NativeText, TextInput as NativeTextInput, StyleSheet, type PressableProps, type TextInputProps, type TextProps } from "react-native";
import { palette } from "./theme";

const AppearanceContext = createContext({ largerText: false, highContrast: false });
export const AppearanceProvider = AppearanceContext.Provider;

const fontFamilies: Record<string, string> = {
  normal: "NotoSans_400Regular",
  "400": "NotoSans_400Regular",
  "500": "NotoSans_500Medium",
  bold: "NotoSans_700Bold",
  "700": "NotoSans_700Bold",
  "600": "NotoSans_700Bold",
  "800": "NotoSans_700Bold",
  "900": "NotoSans_700Bold",
};

export function Text({ style, ...props }: TextProps) {
  const { largerText, highContrast } = useContext(AppearanceContext);
  const textScale = largerText ? 1.18 : 1;
  const textStyle = StyleSheet.flatten(style);
  const fontFamily = textStyle?.fontFamily
    ?? fontFamilies[textStyle?.fontWeight ?? "normal"]
    ?? fontFamilies.normal;
  const textColor = textStyle?.color;
  const improvedColor = highContrast && typeof textColor === "string"
    && (textColor.toUpperCase() === palette.muted
      || ["#687B8B", "#9AA39E", "#9AA59E", "#929C95", "#8C9691", "#829087", "#718493", "#68736D", "#85948A", "#8B9991", "#69746D"]
        .includes(textColor.toUpperCase())
    )
    ? palette.ink
    : textColor;
  const fontSize = typeof textStyle?.fontSize === "number"
    ? Math.max(11, textStyle.fontSize) * textScale
    : undefined;

  return (
    <NativeText
      {...props}
      accessibilityRole={props.accessibilityRole
        ?? (typeof textStyle?.fontSize === "number" && textStyle.fontSize >= 25 ? "header" : undefined)}
      style={[
        style,
        {
          fontFamily,
          fontWeight: "normal",
          ...(fontSize ? { fontSize } : {}),
          ...(improvedColor ? { color: improvedColor } : {}),
        },
      ]}
    />
  );
}

export function Pressable(props: PressableProps) {
  return <NativePressable hitSlop={8} {...props} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  const { largerText } = useContext(AppearanceContext);
  const textScale = largerText ? 1.18 : 1;
  const inputStyle = StyleSheet.flatten(style);
  const fontSize = typeof inputStyle?.fontSize === "number"
    ? Math.max(16, inputStyle.fontSize) * textScale
    : undefined;
  return (
    <NativeTextInput
      {...props}
      style={[style, ...(fontSize ? [{ fontSize }] : [])]}
    />
  );
}
