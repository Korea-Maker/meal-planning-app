import React, { useState } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, ViewStyle } from 'react-native';

interface RecipeImageProps {
  uri?: string | null;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export function RecipeImage({ uri, style, containerStyle, resizeMode = 'cover' }: RecipeImageProps) {
  const [hasError, setHasError] = useState(false);

  // Convert http:// to https:// for safety (except foodsafetykorea which needs http)
  const safeUri = uri && !uri.includes('foodsafetykorea') && uri.startsWith('http://')
    ? uri.replace('http://', 'https://')
    : uri;

  if (!safeUri || hasError) {
    return (
      <View style={[styles.placeholder, containerStyle, style as ViewStyle]}>
        <Text style={styles.placeholderIcon}>🍽️</Text>
        <Text style={styles.placeholderText}>이미지 없음</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: safeUri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setHasError(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
