import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';
import {
  useWeekMealPlan,
  useCreateMealPlan,
  useAddMealSlot,
  useDeleteMealSlot,
  useGenerateShoppingList,
} from '../../hooks';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_TYPES: Array<{ key: MealKey; label: string; emoji: string }> = [
  { key: 'breakfast', label: '아침', emoji: '🌅' },
  { key: 'lunch', label: '점심', emoji: '☀️' },
  { key: 'dinner', label: '저녁', emoji: '🌙' },
  { key: 'snack', label: '간식', emoji: '🍪' },
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

    const isoDate = startOfWeek.toISOString().split('T')[0];

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

  // Helper functions
  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateISO = (date: Date) => {
    return date.toISOString().split('T')[0];
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

  // Handle deleting meal slot
  const handleDeleteSlot = (slotId: string) => {
    if (!mealPlan) return;

    Alert.alert('식사 삭제', '이 식사를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMealSlot.mutateAsync({
              mealPlanId: mealPlan.id,
              slotId,
            });
          } catch (error) {
            Alert.alert('오류', '식사를 삭제하는데 실패했습니다.');
          }
        },
      },
    ]);
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
        <Text style={styles.weekTitle}>
          {weekStartDate.getMonth() + 1}월 {weekStartDate.getDate()}일 - {weekDates[6].getMonth() + 1}월 {weekDates[6].getDate()}일
        </Text>
      </View>

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
                  onPress={() => handleAddMeal(date, mealType.key)}
                  onLongPress={() => slot && handleDeleteSlot(slot.id)}
                >
                  {slot ? (
                    <View style={styles.mealSlotContent}>
                      <Text style={styles.mealSlotTitle} numberOfLines={2}>
                        {slot.recipe.title}
                      </Text>
                      {slot.recipe.servings && (
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
  weekTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
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
});
