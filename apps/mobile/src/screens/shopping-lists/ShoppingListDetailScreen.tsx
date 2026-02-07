import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';
import { useShoppingList, useCheckShoppingItem, useDeleteShoppingList } from '../../hooks';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';
import type { ShoppingItem } from '@meal-planning/shared-types';

interface ShoppingListDetailScreenProps {
  route: {
    params: {
      listId: string;
    };
  };
}

const CATEGORY_EMOJI: Record<string, string> = {
  produce: '🥬',
  meat: '🥩',
  dairy: '🥛',
  bakery: '🍞',
  frozen: '🧊',
  pantry: '🥫',
  beverages: '🥤',
  other: '📦',
};

const CATEGORY_LABELS: Record<string, string> = {
  produce: '농산물',
  meat: '정육/수산',
  dairy: '유제품',
  bakery: '베이커리',
  frozen: '냉동식품',
  pantry: '가공식품',
  beverages: '음료',
  other: '기타',
};

export default function ShoppingListDetailScreen({ route }: ShoppingListDetailScreenProps) {
  const navigation = useSimpleNavigation();
  const { listId } = route.params;
  const { data: shoppingList, isLoading, error, refetch } = useShoppingList(listId);
  const checkItemMutation = useCheckShoppingItem(listId);
  const deleteShoppingList = useDeleteShoppingList();

  const handleDeleteList = () => {
    if (!shoppingList) return;
    Alert.alert(
      '삭제 확인',
      `"${shoppingList.name}" 목록을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShoppingList.mutateAsync(listId);
              navigation.goBack();
            } catch {
              Alert.alert('오류', '목록을 삭제하는데 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleToggleItem = async (itemId: string) => {
    try {
      await checkItemMutation.mutateAsync(itemId);
    } catch (error) {
      if (__DEV__) console.error('Failed to toggle item:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>장보기 목록 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>오류가 발생했습니다</Text>
        <Text style={styles.errorSubtitle}>
          {error instanceof Error ? error.message : '알 수 없는 오류'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!shoppingList) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>🛒</Text>
        <Text style={styles.errorTitle}>목록을 찾을 수 없습니다</Text>
      </View>
    );
  }

  const items = shoppingList.items || [];
  const totalItems = items.length;
  const checkedItems = items.filter((item) => item.is_checked).length;
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const categories = Object.keys(itemsByCategory).sort();

  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const isChecked = item.is_checked;
    const isProcessing = checkItemMutation.isPending;

    return (
      <TouchableOpacity
        style={[styles.itemCard, isChecked && styles.itemCardChecked]}
        onPress={() => handleToggleItem(item.id)}
        activeOpacity={0.7}
        disabled={isProcessing}
      >
        <View style={styles.checkbox}>
          {isChecked && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, isChecked && styles.itemNameChecked]}>
            {item.ingredient_name}
          </Text>
          <Text style={styles.itemAmount}>
            {item.amount} {item.unit}
            {item.notes && ` • ${item.notes}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Back Button Header */}
      <View style={styles.backHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteList} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>🗑 삭제</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>{shoppingList.name}</Text>
          <Text style={styles.headerStats}>
            {checkedItems}/{totalItems} 완료
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
                progress === 100 && styles.progressFillComplete,
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      </View>

      {/* Items List */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>항목이 없습니다</Text>
          <Text style={styles.emptySubtitle}>
            식사 계획에서 장보기 목록을 생성하세요
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((category) => (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryEmoji}>
                  {CATEGORY_EMOJI[category] || '📦'}
                </Text>
                <Text style={styles.categoryTitle}>
                  {CATEGORY_LABELS[category] || category}
                </Text>
                <Text style={styles.categoryCount}>
                  {itemsByCategory[category].length}
                </Text>
              </View>
              {itemsByCategory[category].map((item) => (
                <View key={item.id}>{renderItem({ item })}</View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadow.sm,
  },
  backButton: {
    paddingVertical: spacing.sm,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  deleteButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  header: {
    backgroundColor: colors.card,
    padding: spacing.lg,
    paddingTop: spacing.md,
    ...shadow.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
  },
  headerStats: {
    ...typography.h4,
    color: colors.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  progressFillComplete: {
    backgroundColor: colors.success,
  },
  progressText: {
    ...typography.label,
    color: colors.textSecondary,
    width: 45,
    textAlign: 'right',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryLight,
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  categoryTitle: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
  },
  categoryCount: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  itemCardChecked: {
    backgroundColor: colors.successLight,
    opacity: 0.7,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  itemAmount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
    opacity: 0.5,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  errorSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
