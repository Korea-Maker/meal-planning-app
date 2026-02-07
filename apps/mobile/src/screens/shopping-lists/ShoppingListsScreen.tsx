import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useSimpleNavigation } from '../../navigation/CustomNavigationContext';
import { useShoppingLists, useCreateShoppingList, useDeleteShoppingList } from '../../hooks';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';
import type { ShoppingList } from '@meal-planning/shared-types';

export default function ShoppingListsScreen() {
  const navigation = useSimpleNavigation();
  const { data, isLoading, error, refetch } = useShoppingLists();
  const createShoppingList = useCreateShoppingList();
  const deleteShoppingList = useDeleteShoppingList();

  // Create modal state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handlePress = (listId: string) => {
    if (isEditMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(listId)) {
          next.delete(listId);
        } else {
          next.add(listId);
        }
        return next;
      });
      return;
    }
    navigation.navigate('ShoppingListDetail', { listId });
  };

  const toggleEditMode = () => {
    setIsEditMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    const allIds = new Set((data?.data || []).map((l) => l.id));
    setSelectedIds(allIds);
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      '선택 삭제',
      `${selectedIds.size}개의 목록을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedIds) {
                await deleteShoppingList.mutateAsync(id);
              }
              setSelectedIds(new Set());
              setIsEditMode(false);
            } catch {
              Alert.alert('오류', '일부 목록을 삭제하는데 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleCreateList = async () => {
    const name = newListName.trim();
    if (!name) {
      Alert.alert('알림', '목록 이름을 입력해주세요.');
      return;
    }
    try {
      const list = await createShoppingList.mutateAsync({ name });
      setCreateModalVisible(false);
      setNewListName('');
      if (list?.id) {
        navigation.navigate('ShoppingListDetail', { listId: list.id });
      }
    } catch {
      Alert.alert('오류', '장보기 목록을 생성하는데 실패했습니다.');
    }
  };

  const handleDeleteList = (item: ShoppingList) => {
    Alert.alert(
      '삭제 확인',
      `"${item.name}" 목록을 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteShoppingList.mutateAsync(item.id);
            } catch {
              Alert.alert('오류', '목록을 삭제하는데 실패했습니다.');
            }
          },
        },
      ]
    );
  };

  const renderListItem = ({ item }: { item: ShoppingList }) => {
    // Calculate progress from items (if available in the future)
    // For now, just show the list
    const itemCount = 0; // Will be populated when we fetch items
    const checkedCount = 0;
    const progress = itemCount > 0 ? (checkedCount / itemCount) * 100 : 0;
    const isComplete = itemCount > 0 && checkedCount === itemCount;

    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.listCard, isEditMode && isSelected && styles.listCardSelected]}
        onPress={() => handlePress(item.id)}
        onLongPress={() => !isEditMode && handleDeleteList(item)}
        activeOpacity={0.7}
      >
        <View style={styles.listHeader}>
          {isEditMode && (
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
          )}
          <View style={[styles.listIcon, isComplete && styles.listIconComplete]}>
            <Text style={styles.listIconText}>{isComplete ? '✅' : '🛒'}</Text>
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{item.name}</Text>
            <Text style={styles.listMeta}>
              {new Date(item.created_at).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
              })}
              {item.meal_plan_id && ' • 식사 계획에서 생성됨'}
            </Text>
          </View>
          {!isEditMode && (
            <TouchableOpacity
              style={styles.deleteListButton}
              onPress={() => handleDeleteList(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteListButtonText}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
        {itemCount > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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

  const lists = data?.data || [];

  return (
    <View style={styles.container}>
      {/* Edit Mode Header */}
      {lists.length > 0 && (
        <View style={styles.editHeader}>
          {isEditMode && (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.editActionText}>전체 선택</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={deleteSelected}
                disabled={selectedIds.size === 0}
              >
                <Text style={[
                  styles.editDeleteText,
                  selectedIds.size === 0 && styles.editDeleteTextDisabled,
                ]}>
                  삭제 ({selectedIds.size})
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={toggleEditMode} style={styles.editToggleButton}>
            <Text style={styles.editToggleText}>
              {isEditMode ? '완료' : '편집'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={lists}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          lists.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>장보기 목록이 없습니다</Text>
              <Text style={styles.emptySubtitle}>
                식사 계획에서 자동으로 생성하세요
              </Text>
            </View>
          ) : null
        }
      />

      {isLoading && lists.length === 0 && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>장보기 목록 불러오는 중...</Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새 장보기 목록</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="목록 이름 (예: 이번 주 장보기)"
              placeholderTextColor={colors.textMuted}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreateList}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setCreateModalVisible(false);
                  setNewListName('');
                }}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, createShoppingList.isPending && styles.modalCreateButtonDisabled]}
                onPress={handleCreateList}
                disabled={createShoppingList.isPending}
              >
                {createShoppingList.isPending ? (
                  <ActivityIndicator size="small" color={colors.textLight} />
                ) : (
                  <Text style={styles.modalCreateText}>생성</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.md,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  listIconComplete: {
    backgroundColor: colors.successLight,
  },
  listIconText: {
    fontSize: 24,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  listMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    ...typography.labelSmall,
    color: colors.textSecondary,
    width: 40,
    textAlign: 'right',
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
  deleteListButton: {
    padding: spacing.sm,
  },
  deleteListButtonText: {
    fontSize: 18,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.lg,
  },
  fabText: {
    fontSize: 28,
    color: colors.textLight,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalInput: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.lg,
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
  modalCancelText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  modalCreateButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    ...shadow.md,
  },
  modalCreateButtonDisabled: {
    opacity: 0.5,
  },
  modalCreateText: {
    ...typography.button,
    color: colors.textLight,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
  },
  editActionText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  editDeleteText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  editDeleteTextDisabled: {
    opacity: 0.4,
  },
  editToggleButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  editToggleText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  listCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxCheck: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: '700',
  },
});
