import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';
import { useExtractRecipeFromUrl, useCreateRecipe } from '../../hooks/use-recipes';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';
import type { CreateRecipeRequest } from '@meal-planning/shared-types';

interface URLImportScreenProps {
  route: { params?: {} };
}

export default function URLImportScreen({ route }: URLImportScreenProps) {
  const navigation = useSimpleNavigation();
  const extractRecipe = useExtractRecipeFromUrl();
  const createRecipe = useCreateRecipe();

  const [url, setUrl] = useState('');
  const [step, setStep] = useState<'input' | 'extracting' | 'preview'>('input');
  const [extractedRecipe, setExtractedRecipe] = useState<CreateRecipeRequest | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleExtract = async () => {
    if (!url.trim()) return;
    // 기본 URL 유효성 검사
    try { new URL(url); } catch { Alert.alert('오류', '올바른 URL을 입력해주세요'); return; }

    setStep('extracting');
    try {
      const result = await extractRecipe.mutateAsync({ url });
      if (result.success && result.recipe) {
        setExtractedRecipe(result.recipe);
        setConfidence(result.confidence);
        setStep('preview');
      } else {
        throw new Error(result.error || '레시피를 추출할 수 없습니다');
      }
    } catch (error) {
      Alert.alert('추출 실패', error instanceof Error ? error.message : '레시피 추출에 실패했습니다');
      setStep('input');
    }
  };

  const handleSave = async () => {
    if (!extractedRecipe) return;
    setSaving(true);
    try {
      await createRecipe.mutateAsync(extractedRecipe);
      Alert.alert('성공', '레시피가 저장되었습니다', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '레시피 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAndSave = () => {
    if (!extractedRecipe) return;
    // RecipeFormScreen으로 이동하면서 importedRecipe 전달
    navigation.goBack(); // 먼저 뒤로가기
    // 약간의 딜레이 후 RecipeForm으로 이동
    setTimeout(() => {
      navigation.navigate('RecipeForm', { importedRecipe: extractedRecipe });
    }, 100);
  };

  const handleReset = () => {
    setUrl('');
    setStep('input');
    setExtractedRecipe(null);
    setConfidence(0);
  };

  const getConfidenceLabel = (value: number) => {
    if (value >= 0.9) return { label: '높음', color: colors.success || '#22c55e' };
    if (value >= 0.7) return { label: '보통', color: colors.warning || '#eab308' };
    return { label: '낮음', color: colors.error || '#ef4444' };
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>URL에서 가져오기</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Step 1: URL Input */}
      {step === 'input' && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>레시피 URL 입력</Text>
            <Text style={styles.sectionSubtitle}>
              레시피 페이지의 URL을 입력하면 자동으로 레시피 정보를 추출합니다.
            </Text>
            <TextInput
              style={styles.urlInput}
              placeholder="https://example.com/recipe/..."
              placeholderTextColor={colors.textMuted}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleExtract}
            />
            <TouchableOpacity
              style={[styles.extractButton, !url.trim() && styles.extractButtonDisabled]}
              onPress={handleExtract}
              disabled={!url.trim()}
            >
              <Text style={styles.extractButtonText}>추출하기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>지원 사이트</Text>
            <Text style={styles.infoText}>• Schema.org 레시피 마크업이 있는 사이트 (높은 정확도)</Text>
            <Text style={styles.infoText}>• 일반 레시피 페이지 (AI 추출)</Text>
          </View>
        </ScrollView>
      )}

      {/* Step 2: Extracting */}
      {step === 'extracting' && (
        <View style={styles.extractingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.extractingText}>레시피를 추출하는 중...</Text>
          <Text style={styles.extractingSubtext}>잠시만 기다려 주세요</Text>
        </View>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && extractedRecipe && (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Confidence Badge */}
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>추출 완료</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceLabel(confidence).color + '20' }]}>
              <Text style={[styles.confidenceText, { color: getConfidenceLabel(confidence).color }]}>
                신뢰도: {getConfidenceLabel(confidence).label} ({Math.round(confidence * 100)}%)
              </Text>
            </View>
          </View>

          {/* Recipe Preview Card */}
          <View style={styles.previewCard}>
            {extractedRecipe.image_url ? (
              <Image source={{ uri: extractedRecipe.image_url }} style={styles.previewImage} />
            ) : (
              <View style={[styles.previewImage, styles.previewImagePlaceholder]}>
                <Text style={styles.placeholderEmoji}>🍽️</Text>
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle}>{extractedRecipe.title}</Text>
              {extractedRecipe.description && (
                <Text style={styles.previewDescription} numberOfLines={3}>
                  {extractedRecipe.description}
                </Text>
              )}
              <View style={styles.previewMeta}>
                {extractedRecipe.prep_time_minutes && (
                  <Text style={styles.previewMetaText}>준비 {extractedRecipe.prep_time_minutes}분</Text>
                )}
                {extractedRecipe.cook_time_minutes && (
                  <Text style={styles.previewMetaText}>조리 {extractedRecipe.cook_time_minutes}분</Text>
                )}
                <Text style={styles.previewMetaText}>{extractedRecipe.servings}인분</Text>
                <Text style={styles.previewMetaText}>재료 {extractedRecipe.ingredients?.length || 0}개</Text>
                <Text style={styles.previewMetaText}>단계 {extractedRecipe.instructions?.length || 0}개</Text>
              </View>
            </View>
          </View>

          {confidence < 0.8 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ AI 추출 결과입니다</Text>
              <Text style={styles.warningText}>저장 전에 내용을 확인하고 필요시 수정해 주세요.</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
              <Text style={styles.secondaryButtonText}>다시 시도</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleEditAndSave}>
              <Text style={styles.secondaryButtonText}>수정 후 저장</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.textLight} />
              ) : (
                <Text style={styles.primaryButtonText}>바로 저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: spacing.sm },
  backButtonText: { fontSize: 24, color: colors.text },
  headerTitle: { ...typography.h4, color: colors.text },
  headerRight: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: spacing.lg, paddingBottom: 40 },
  inputSection: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  urlInput: {
    height: 48, backgroundColor: colors.card, borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg, ...typography.body, color: colors.text,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  extractButton: {
    height: 48, backgroundColor: colors.primary, borderRadius: borderRadius.xl,
    justifyContent: 'center', alignItems: 'center',
  },
  extractButtonDisabled: { opacity: 0.5 },
  extractButtonText: { ...typography.button, color: colors.textLight },
  infoSection: {
    padding: spacing.lg, backgroundColor: colors.card, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  infoTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  infoText: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xs },
  extractingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  extractingText: { ...typography.h4, color: colors.text, marginTop: spacing.lg },
  extractingSubtext: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  confidenceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  confidenceLabel: { ...typography.h4, color: colors.text },
  confidenceBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  confidenceText: { ...typography.bodySmall, fontWeight: '600' },
  previewCard: {
    backgroundColor: colors.card, borderRadius: borderRadius['2xl'],
    overflow: 'hidden', marginBottom: spacing.lg, ...shadow.md,
  },
  previewImage: { width: '100%', height: 200 },
  previewImagePlaceholder: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  placeholderEmoji: { fontSize: 48 },
  previewInfo: { padding: spacing.lg },
  previewTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  previewDescription: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  previewMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  previewMetaText: { ...typography.bodySmall, color: colors.textSecondary },
  warningBox: {
    padding: spacing.lg, backgroundColor: '#fef9c3', borderRadius: borderRadius.xl,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: '#fde047',
  },
  warningTitle: { ...typography.button, color: '#854d0e', marginBottom: spacing.xs },
  warningText: { ...typography.bodySmall, color: '#a16207' },
  actionButtons: {
    flexDirection: 'row', gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1, height: 48, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  secondaryButtonText: { ...typography.button, color: colors.text },
  primaryButton: {
    flex: 1, height: 48, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { ...typography.button, color: colors.textLight },
});
