import React, { useState, useCallback } from 'react';
import { Image, View, Text, StyleSheet, ImageStyle, ViewStyle, Platform } from 'react-native';

interface RecipeImageProps {
  uri?: string | null;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

const PROXY_BASE = Platform.OS === 'ios'
  ? 'http://localhost:8000/api/v1/proxy/image?url='
  : null;

function toDisplayUri(uri: string): string {
  let safeUri = uri;
  if (uri.startsWith('http://') && !uri.includes('foodsafetykorea')) {
    safeUri = uri.replace('http://', 'https://');
  }

  // Route TheMealDB images through backend proxy on iOS
  // iOS native Image loader silently fails for these URLs
  if (PROXY_BASE && safeUri.includes('themealdb.com')) {
    return PROXY_BASE + encodeURIComponent(safeUri);
  }

  return safeUri;
}

export function RecipeImage({ uri, style, containerStyle, resizeMode = 'cover' }: RecipeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [retried, setRetried] = useState(false);
  const [displayUri, setDisplayUri] = useState<string | null>(uri ? toDisplayUri(uri) : null);

  const handleError = useCallback(() => {
    if (!uri || retried) {
      setHasError(true);
      return;
    }
    // Retry once with cache-busting
    const base = toDisplayUri(uri);
    setDisplayUri(base + (base.includes('?') ? '&' : '?') + '_cb=' + Date.now());
    setRetried(true);
  }, [uri, retried]);

  if (!uri || hasError) {
    return (
      <View style={[styles.placeholder, containerStyle, style as ViewStyle]}>
        <Text style={styles.placeholderIcon}>🍽️</Text>
        <Text style={styles.placeholderText}>이미지 없음</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: displayUri || undefined }}
      style={style}
      resizeMode={resizeMode}
      onError={handleError}
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
