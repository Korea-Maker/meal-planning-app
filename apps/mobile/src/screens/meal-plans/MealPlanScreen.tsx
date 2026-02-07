import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';
import {
  useWeekMealPlan,
  useCreateMealPlan,
  useAddMealSlot,
  useDeleteMealSlot,
  useGenerateShoppingList,
  useDiscoverRecipes,
  useQuickPlan,
} from '../../hooks';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';
import type { ExternalRecipePreview } from '@meal-planning/shared-types';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: Array<{ key: MealKey; label: string; emoji: string }> = [
  { key: 'breakfast', label: '아침', emoji: '🌅' },
  { key: 'lunch', label: '점심', emoji: '☀️' },
  { key: 'dinner', label: '저녁', emoji: '🌙' },
  { key: 'snack', label: '간식', emoji: '🍪' },
];

const CUISINES = [
  { value: '', label: '전체 요리' },
  { value: 'Korean', label: '한식' },
  { value: 'Japanese', label: '일식' },
  { value: 'Chinese', label: '중식' },
  { value: 'Italian', label: '이탈리안' },
  { value: 'Mexican', label: '멕시칸' },
];

const mealSlotStyles: Record<MealKey, ViewStyle> = {
  breakfast: {
    backgroundColor: colors.meal.breakfast.bg,
    borderColor: colors.meal.breakfast.border,
  },
  lunch: {
    backgroundColor: colors.meal.lunch.bg,
    borderColor: colors.meal.lunch.border,
  },
  dinner: {
    backgroundColor: colors.meal.dinner.bg,
    borderColor: colors.meal.dinner.border,
  },
  snack: {
    backgroundColor: colors.meal.snack.bg,
    borderColor: colors.meal.snack.border,
  },
};

export default function MealPlanScreen() {
  const navigation = useSimpleNavigation();

  // Generate current week dates (Sunday to Saturday)
  const { weekDates, weekStartDate, weekStartDateISO } = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    const sy = startOfWeek.getFullYear();
    const sm = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const sd = String(startOfWeek.getDate()).padStart(2, '0');
    const isoDate = `${sy}-${sm}-${sd}`;

    return {
      weekDates: dates,
      weekStartDate: startOfWeek,
      weekStartDateISO: isoDate,
    };
  }, []);

  // Fetch week meal plan
  const { data: mealPlan, isLoading, error, refetch } = useWeekMealPlan(weekStartDateISO);
  const createMealPlan = useCreateMealPlan();
  const addMealSlot = useAddMealSlot();
  const deleteMealSlot = useDeleteMealSlot();
  const generateShoppingList = useGenerateShoppingList();
  const quickPlan = useQuickPlan();

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());

  // Auto-fill state
  const [autoFillModalVisible, setAutoFillModalVisible] = useState(false);
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealKey[]>(['lunch', 'dinner']);
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Fetch discover recipes when cuisine is selected (or default)
  const discoverParams = autoFillModalVisible ? (selectedCuisine ? { cuisine: selectedCuisine } : {}) : undefined;
  const { data: discoverData, isLoading: isDiscoverLoading, isFetching: isDiscoverFetching } = useDiscoverRecipes(discoverParams);

  const toggleMealType = useCallback((mealType: MealKey) => {
    setSelectedMealTypes((prev) =>
      prev.includes(mealType)
        ? prev.filter((t) => t !== mealType)
        : [...prev, mealType]
    );
  }, []);

  const handleAutoFill = useCallback(async () => {
    if (selectedMealTypes.length === 0) {
      Alert.alert('알림', '식사 시간대를 선택해주세요.');
      return;
    }

    if (isDiscoverLoading || isDiscoverFetching) {
      Alert.alert('알림', '추천 레시피를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const recipes: ExternalRecipePreview[] = [
      ...(discoverData?.korean_seed || []),
      ...(discoverData?.spoonacular || []),
      ...(discoverData?.themealdb || []),
    ];

    if (recipes.length === 0) {
      Alert.alert('알림', '추천 레시피가 없습니다. 다른 요리 종류를 선택해보세요.');
      return;
    }

    setIsAutoFilling(true);

    try {
      // Find empty slots for the current week (skip past dates)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingKeys = new Set(
        (mealPlan?.slots || []).map((s) => `${s.date}-${s.meal_type}`)
      );

      const slotsToFill: Array<{ date: string; meal_type: MealKey }> = [];

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(weekStartDate.getDate() + dayOffset);

        // Skip past dates
        if (dayDate < today) continue;

        // Use local date format to avoid UTC timezone offset issues (KST+9)
        const y = dayDate.getFullYear();
        const m = String(dayDate.getMonth() + 1).padStart(2, '0');
        const d = String(dayDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        for (const mealType of selectedMealTypes) {
          const key = `${dateStr}-${mealType}`;
          if (!existingKeys.has(key)) {
            slotsToFill.push({ date: dateStr, meal_type: mealType });
          }
        }
      }

      if (slotsToFill.length === 0) {
        Alert.alert('알림', '채울 빈 슬롯이 없습니다.');
        setAutoFillModalVisible(false);
        setIsAutoFilling(false);
        return;
      }

      // Build quick plan slots
      const quickPlanSlots = slotsToFill.map((slot, idx) => ({
        source: recipes[idx % recipes.length].source,
        external_id: recipes[idx % recipes.length].external_id,
        date: slot.date,
        meal_type: slot.meal_type,
        servings: 2,
      }));

      await quickPlan.mutateAsync({
        week_start_date: weekStartDateISO,
        slots: quickPlanSlots,
      });

      setAutoFillModalVisible(false);
      Alert.alert('완료', `${quickPlanSlots.length}개의 레시피가 추가되었습니다!`);
    } catch {
      Alert.alert('오류', '자동 채우기에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsAutoFilling(false);
    }
  }, [selectedMealTypes, discoverData, mealPlan, weekStartDate, weekStartDateISO, quickPlan, isDiscoverLoading, isDiscoverFetching]);

  // Helper functions
  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Find slot for specific date and meal type
  const findSlot = (date: Date, mealType: MealKey) => {
    if (!mealPlan?.slots) return null;
    const dateStr = formatDateISO(date);
    return mealPlan.slots.find(
      (slot) => slot.date === dateStr && slot.meal_type === mealType
    );
  };

  // Handle adding meal slot
  const handleAddMeal = async (date: Date, mealType: MealKey) => {
    const dateStr = formatDateISO(date);

    // If no meal plan exists, create one first
    if (!mealPlan) {
      try {
        const newPlan = await createMealPlan.mutateAsync({
          week_start_date: weekStartDateISO,
          notes: `${weekStartDate.getMonth() + 1}월 ${weekStartDate.getDate()}일 주간 계획`,
        });

        // Navigate to recipe selection with meal plan ID
        navigation.navigate('AddMeal', {
          date: dateStr,
          mealType,
        });
      } catch (error) {
        Alert.alert('오류', '식사 계획을 생성하는데 실패했습니다.');
      }
    } else {
      // Navigate to recipe selection
      navigation.navigate('AddMeal', {
        date: dateStr,
        mealType,
      });
    }
  };

  // Handle tapping a slot
  const handleSlotPress = (date: Date, mealType: MealKey, slot: { id: string; recipe: { id: string; title: string } } | null | undefined) => {
    if (isEditMode && slot) {
      // Edit mode - toggle selection
      setSelectedSlotIds((prev) => {
        const next = new Set(prev);
        if (next.has(slot.id)) {
          next.delete(slot.id);
        } else {
          next.add(slot.id);
        }
        return next;
      });
      return;
    }

    if (slot) {
      // Filled slot - navigate to recipe detail (stays in mealplans tab)
      navigation.navigate('MealPlanRecipeDetail', {
        recipeId: slot.recipe.id,
        mealPlanId: mealPlan?.id,
        slotId: slot.id,
      });
    } else {
      // Empty slot - navigate to add meal
      handleAddMeal(date, mealType);
    }
  };

  // Handle long press on filled slot - show delete confirmation
  const handleSlotLongPress = (slot: { id: string; recipe: { title: string } }) => {
    if (isEditMode) return;
    if (!mealPlan) return;

    Alert.alert(
      slot.recipe.title,
      '이 식사를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMealSlot.mutateAsync({
                mealPlanId: mealPlan.id,
                slotId: slot.id,
              });
            } catch {
              Alert.alert('오류', '식사를 삭제하는데 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  // Edit mode handlers
  const toggleEditMode = () => {
    setIsEditMode((prev) => !prev);
    setSelectedSlotIds(new Set());
  };

  const selectAllSlots = () => {
    if (!mealPlan?.slots) return;
    setSelectedSlotIds(new Set(mealPlan.slots.map((s) => s.id)));
  };

  const deleteSelectedSlots = () => {
    if (!mealPlan || selectedSlotIds.size === 0) return;

    Alert.alert(
      '선택 삭제',
      `${selectedSlotIds.size}개의 식사를 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const slotId of selectedSlotIds) {
                await deleteMealSlot.mutateAsync({
                  mealPlanId: mealPlan.id,
                  slotId,
                });
              }
              setSelectedSlotIds(new Set());
              setIsEditMode(false);
            } catch {
              Alert.alert('오류', '일부 식사를 삭제하는데 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  // Handle generating shopping list
  const handleGenerateShoppingList = async () => {
    if (!mealPlan) {
      Alert.alert('알림', '먼저 식사 계획을 추가해주세요.');
      return;
    }

    try {
      await generateShoppingList.mutateAsync(mealPlan.id);
      Alert.alert('성공', '장보기 목록이 생성되었습니다!', [
        {
          text: '확인',
          onPress: () => {
            // Navigate to shopping tab
            navigation.navigate('ShoppingTab', {
              screen: 'ShoppingLists',
            });
          },
        },
      ]);
    } catch (error) {
      Alert.alert('오류', '장보기 목록을 생성하는데 실패했습니다.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>식사 계획을 불러오는 중...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>식사 계획을 불러오는데 실패했습니다.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Week Header */}
      <View style={styles.weekHeader}>
        <View style={styles.weekHeaderRow}>
          <Text style={styles.weekTitle}>
            {weekStartDate.getMonth() + 1}월 {weekStartDate.getDate()}일 - {weekDates[6].getMonth() + 1}월 {weekDates[6].getDate()}일
          </Text>
          {mealPlan && mealPlan.slots.length > 0 && (
            <TouchableOpacity
              style={[styles.editModeButton, isEditMode && styles.editModeButtonActive]}
              onPress={toggleEditMode}
            >
              <Text style={[styles.editModeButtonText, isEditMode && styles.editModeButtonTextActive]}>
                {isEditMode ? '완료' : '편집'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {!isEditMode && (
          <TouchableOpacity
            style={styles.autoFillButton}
            onPress={() => setAutoFillModalVisible(true)}
          >
            <Text style={styles.autoFillButtonText}>✨ 추천으로 채우기</Text>
          </TouchableOpacity>
        )}
        {isEditMode && (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.editActionButton} onPress={selectAllSlots}>
              <Text style={styles.editActionText}>전체 선택</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editDeleteButton, selectedSlotIds.size === 0 && styles.editDeleteButtonDisabled]}
              onPress={deleteSelectedSlots}
              disabled={selectedSlotIds.size === 0}
            >
              <Text style={[styles.editDeleteButtonText, selectedSlotIds.size === 0 && styles.editDeleteButtonTextDisabled]}>
                🗑 선택 삭제 ({selectedSlotIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Auto-fill Modal */}
      <Modal
        visible={autoFillModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAutoFillModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✨ 추천으로 자동 채우기</Text>

            {/* Meal type selection */}
            <Text style={styles.modalSectionLabel}>채울 식사 시간대</Text>
            <View style={styles.mealTypeGrid}>
              {MEAL_TYPES.map((mt) => (
                <TouchableOpacity
                  key={mt.key}
                  style={[
                    styles.mealTypeChip,
                    selectedMealTypes.includes(mt.key) && styles.mealTypeChipSelected,
                  ]}
                  onPress={() => toggleMealType(mt.key)}
                >
                  <Text
                    style={[
                      styles.mealTypeChipText,
                      selectedMealTypes.includes(mt.key) && styles.mealTypeChipTextSelected,
                    ]}
                  >
                    {mt.emoji} {mt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cuisine selection */}
            <Text style={styles.modalSectionLabel}>요리 종류</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cuisineScroll}>
              {CUISINES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.cuisineChip,
                    selectedCuisine === c.value && styles.cuisineChipSelected,
                  ]}
                  onPress={() => setSelectedCuisine(c.value)}
                >
                  <Text
                    style={[
                      styles.cuisineChipText,
                      selectedCuisine === c.value && styles.cuisineChipTextSelected,
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalHelpText}>
              빈 슬롯에 추천 레시피가 자동으로 채워집니다.{'\n'}이미 레시피가 있는 슬롯은 건너뜁니다.
            </Text>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setAutoFillModalVisible(false)}
                disabled={isAutoFilling}
              >
                <Text style={styles.modalCancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalFillButton,
                  (selectedMealTypes.length === 0 || isAutoFilling || isDiscoverFetching) && styles.modalFillButtonDisabled,
                ]}
                onPress={handleAutoFill}
                disabled={selectedMealTypes.length === 0 || isAutoFilling || isDiscoverFetching}
              >
                {isAutoFilling ? (
                  <ActivityIndicator size="small" color={colors.textLight} />
                ) : isDiscoverFetching ? (
                  <Text style={styles.modalFillButtonText}>레시피 불러오는 중...</Text>
                ) : (
                  <Text style={styles.modalFillButtonText}>✨ 자동 채우기</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Grid */}
      <ScrollView style={styles.calendarContainer} showsVerticalScrollIndicator={false}>
        {/* Day Headers */}
        <View style={styles.dayHeaderRow}>
          <View style={styles.mealTypeColumn} />
          {weekDates.map((date, index) => (
            <View
              key={index}
              style={[styles.dayHeader, isToday(date) && styles.dayHeaderToday]}
            >
              <Text style={[styles.dayName, isToday(date) && styles.dayNameToday]}>
                {DAYS[index]}
              </Text>
              <Text style={[styles.dayDate, isToday(date) && styles.dayDateToday]}>
                {formatDate(date)}
              </Text>
            </View>
          ))}
        </View>

        {/* Meal Rows */}
        {MEAL_TYPES.map((mealType) => (
          <View key={mealType.key} style={styles.mealRow}>
            <View style={styles.mealTypeColumn}>
              <Text style={styles.mealTypeEmoji}>{mealType.emoji}</Text>
              <Text style={styles.mealTypeLabel}>{mealType.label}</Text>
            </View>
            {weekDates.map((date, index) => {
              const slot = findSlot(date, mealType.key);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.mealSlot,
                    mealSlotStyles[mealType.key],
                    slot && styles.mealSlotFilled,
                  ]}
                  onPress={() => handleSlotPress(date, mealType.key, slot)}
                  onLongPress={() => slot && handleSlotLongPress(slot)}
                >
                  {slot ? (
                    <View style={styles.mealSlotContent}>
                      {isEditMode && (
                        <View style={[styles.editCheckbox, selectedSlotIds.has(slot.id) && styles.editCheckboxSelected]}>
                          {selectedSlotIds.has(slot.id) && <Text style={styles.editCheckmark}>✓</Text>}
                        </View>
                      )}
                      <Text style={styles.mealSlotTitle} numberOfLines={2}>
                        {slot.recipe.title}
                      </Text>
                      {!isEditMode && slot.recipe.servings && (
                        <Text style={styles.mealSlotServings}>{slot.recipe.servings}인분</Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.addMealText}>+</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Generate Shopping List Button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            (!mealPlan || mealPlan.slots.length === 0) && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerateShoppingList}
          disabled={!mealPlan || mealPlan.slots.length === 0 || generateShoppingList.isPending}
        >
          {generateShoppingList.isPending ? (
            <ActivityIndicator size="small" color={colors.textLight} />
          ) : (
            <Text style={styles.generateButtonText}>🛒 장보기 목록 생성</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
  weekHeader: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekTitle: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
  },
  editModeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editModeButtonActive: {
    backgroundColor: colors.primary,
  },
  editModeButtonText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '600',
  },
  editModeButtonTextActive: {
    color: colors.textLight,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  editActionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editActionText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },
  editDeleteButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  editDeleteButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  editDeleteButtonText: {
    ...typography.labelSmall,
    color: colors.textLight,
    fontWeight: '600',
  },
  editDeleteButtonTextDisabled: {
    color: colors.textLight,
  },
  calendarContainer: {
    flex: 1,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealTypeColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dayHeaderToday: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    marginHorizontal: 2,
  },
  dayName: {
    ...typography.labelSmall,
    color: colors.textSecondary,
  },
  dayNameToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  dayDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  dayDateToday: {
    color: colors.primary,
  },
  mealRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealTypeEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  mealTypeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  mealSlot: {
    flex: 1,
    height: 60,
    marginHorizontal: 2,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  mealSlotFilled: {
    borderStyle: 'solid',
    ...shadow.sm,
  },
  mealSlotContent: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSlotTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  mealSlotServings: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  addMealText: {
    ...typography.h3,
    color: colors.textMuted,
    opacity: 0.5,
  },
  generateButton: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadow.md,
  },
  generateButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  generateButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
  // Auto-fill button
  autoFillButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  autoFillButtonText: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalSectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  mealTypeChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  mealTypeChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  mealTypeChipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  mealTypeChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  cuisineScroll: {
    marginBottom: spacing.lg,
  },
  cuisineChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  cuisineChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  cuisineChipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  cuisineChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalHelpText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  modalFillButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    ...shadow.md,
  },
  modalFillButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  modalFillButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
  // Edit mode checkbox styles
  editCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  editCheckboxSelected: {
    backgroundColor: colors.primary,
  },
  editCheckmark: {
    color: colors.textLight,
    fontSize: 10,
    fontWeight: '700',
  },
});
