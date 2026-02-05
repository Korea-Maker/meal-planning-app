import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RecipeStackParamList } from '../../navigation/types';
import type { RecipeDifficulty, RecipeCategory, CreateIngredientRequest, CreateInstructionRequest } from '@meal-planning/shared-types';
import { useCreateRecipe, useUpdateRecipe, useRecipe } from '../../hooks';
import { showImagePickerOptions, ImageResult } from '../../utils/imagePicker';
import { colors, typography, spacing, borderRadius, shadow } from '../../styles';

type NavigationProp = NativeStackNavigationProp<RecipeStackParamList, 'RecipeForm'>;
type RouteProps = RouteProp<RecipeStackParamList, 'RecipeForm'>;

const DIFFICULTY_OPTIONS: { value: RecipeDifficulty; label: string }[] = [
  { value: 'easy', label: '쉬움' },
  { value: 'medium', label: '보통' },
  { value: 'hard', label: '어려움' },
];

const CATEGORY_OPTIONS: { value: RecipeCategory; label: string }[] = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
  { value: 'dessert', label: '디저트' },
  { value: 'appetizer', label: '애피타이저' },
  { value: 'side', label: '사이드' },
  { value: 'drink', label: '음료' },
];

interface IngredientInput extends Omit<CreateIngredientRequest, 'order_index'> {
  tempId: string;
}

interface InstructionInput extends CreateInstructionRequest {
  tempId: string;
}

export default function RecipeFormScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { recipeId } = route.params;

  const isEditMode = Boolean(recipeId);

  // Fetch existing recipe if editing
  const { data: existingRecipe } = useRecipe(recipeId || '', { enabled: isEditMode });

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('4');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>('medium');
  const [selectedCategories, setSelectedCategories] = useState<RecipeCategory[]>([]);
  const [imageResult, setImageResult] = useState<ImageResult | null>(null);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { tempId: '1', name: '', amount: 0, unit: '' },
  ]);
  const [instructions, setInstructions] = useState<InstructionInput[]>([
    { tempId: '1', step_number: 1, description: '' },
  ]);

  const createRecipeMutation = useCreateRecipe();
  const updateRecipeMutation = useUpdateRecipe();

  // Populate form when editing
  React.useEffect(() => {
    if (existingRecipe) {
      setTitle(existingRecipe.title);
      setDescription(existingRecipe.description || '');
      setServings(String(existingRecipe.servings));
      setPrepTime(existingRecipe.prep_time_minutes ? String(existingRecipe.prep_time_minutes) : '');
      setCookTime(existingRecipe.cook_time_minutes ? String(existingRecipe.cook_time_minutes) : '');
      setDifficulty(existingRecipe.difficulty);
      setSelectedCategories(existingRecipe.categories || []);

      if (existingRecipe.ingredients) {
        setIngredients(
          existingRecipe.ingredients.map((ing, idx) => ({
            tempId: String(idx + 1),
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            notes: ing.notes || undefined,
          }))
        );
      }

      if (existingRecipe.instructions) {
        setInstructions(
          existingRecipe.instructions.map((inst, idx) => ({
            tempId: String(idx + 1),
            step_number: inst.step_number,
            description: inst.description,
          }))
        );
      }
    }
  }, [existingRecipe]);

  const handleImagePick = async () => {
    const result = await showImagePickerOptions();
    if (result) {
      setImageResult(result);
    }
  };

  const toggleCategory = (category: RecipeCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const addIngredient = () => {
    const newId = String(Date.now());
    setIngredients([...ingredients, { tempId: newId, name: '', amount: 0, unit: '' }]);
  };

  const removeIngredient = (tempId: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((ing) => ing.tempId !== tempId));
    }
  };

  const updateIngredient = (tempId: string, field: keyof IngredientInput, value: string | number) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.tempId === tempId ? { ...ing, [field]: value } : ing
      )
    );
  };

  const addInstruction = () => {
    const newId = String(Date.now());
    const nextStep = instructions.length + 1;
    setInstructions([...instructions, { tempId: newId, step_number: nextStep, description: '' }]);
  };

  const removeInstruction = (tempId: string) => {
    if (instructions.length > 1) {
      const filtered = instructions.filter((inst) => inst.tempId !== tempId);
      // Renumber steps
      const renumbered = filtered.map((inst, idx) => ({
        ...inst,
        step_number: idx + 1,
      }));
      setInstructions(renumbered);
    }
  };

  const updateInstruction = (tempId: string, description: string) => {
    setInstructions(
      instructions.map((inst) =>
        inst.tempId === tempId ? { ...inst, description } : inst
      )
    );
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('오류', '레시피 제목을 입력해주세요.');
      return false;
    }

    if (!servings || parseInt(servings) < 1) {
      Alert.alert('오류', '인분 수를 입력해주세요.');
      return false;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      Alert.alert('오류', '최소 1개의 재료를 입력해주세요.');
      return false;
    }

    const validInstructions = instructions.filter((inst) => inst.description.trim());
    if (validInstructions.length === 0) {
      Alert.alert('오류', '최소 1개의 조리 단계를 입력해주세요.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const validIngredients: CreateIngredientRequest[] = ingredients
      .filter((ing) => ing.name.trim())
      .map((ing, idx) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        notes: ing.notes,
        order_index: idx,
      }));

    const validInstructions: CreateInstructionRequest[] = instructions
      .filter((inst) => inst.description.trim())
      .map((inst) => ({
        step_number: inst.step_number,
        description: inst.description,
      }));

    const recipeData = {
      title,
      description: description.trim() || undefined,
      image_url: imageResult?.uri,
      prep_time_minutes: prepTime ? parseInt(prepTime) : undefined,
      cook_time_minutes: cookTime ? parseInt(cookTime) : undefined,
      servings: parseInt(servings),
      difficulty,
      categories: selectedCategories,
      ingredients: validIngredients,
      instructions: validInstructions,
    };

    try {
      if (isEditMode && recipeId) {
        await updateRecipeMutation.mutateAsync({ id: recipeId, data: recipeData });
        Alert.alert('성공', '레시피가 수정되었습니다.');
      } else {
        await createRecipeMutation.mutateAsync(recipeData);
        Alert.alert('성공', '레시피가 생성되었습니다.');
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('오류', isEditMode ? '레시피 수정에 실패했습니다.' : '레시피 생성에 실패했습니다.');
    }
  };

  const isSubmitting = createRecipeMutation.isPending || updateRecipeMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>사진</Text>
          <TouchableOpacity style={styles.imageContainer} onPress={handleImagePick}>
            {imageResult ? (
              <Image source={{ uri: imageResult.uri }} style={styles.recipeImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>📷</Text>
                <Text style={styles.imagePlaceholderText}>사진 추가</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>레시피 제목 *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="예: 김치볶음밥"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>설명</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="레시피에 대한 간단한 설명을 입력하세요"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>인분 *</Text>
              <TextInput
                style={styles.input}
                value={servings}
                onChangeText={setServings}
                placeholder="4"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>준비 시간 (분)</Text>
              <TextInput
                style={styles.input}
                value={prepTime}
                onChangeText={setPrepTime}
                placeholder="15"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>조리 시간 (분)</Text>
              <TextInput
                style={styles.input}
                value={cookTime}
                onChangeText={setCookTime}
                placeholder="30"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>난이도</Text>
          <View style={styles.optionsRow}>
            {DIFFICULTY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  difficulty === option.value && styles.optionButtonSelected,
                ]}
                onPress={() => setDifficulty(option.value)}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    difficulty === option.value && styles.optionButtonTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>카테고리</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORY_OPTIONS.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={[
                  styles.categoryChip,
                  selectedCategories.includes(category.value) && styles.categoryChipSelected,
                ]}
                onPress={() => toggleCategory(category.value)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategories.includes(category.value) && styles.categoryChipTextSelected,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>재료 *</Text>
          {ingredients.map((ingredient, index) => (
            <View key={ingredient.tempId} style={styles.listItem}>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemNumber}>{index + 1}</Text>
                {ingredients.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeIngredient(ingredient.tempId)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                value={ingredient.name}
                onChangeText={(text) => updateIngredient(ingredient.tempId, 'name', text)}
                placeholder="재료명 (예: 김치)"
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.flex2]}
                  value={ingredient.amount ? String(ingredient.amount) : ''}
                  onChangeText={(text) =>
                    updateIngredient(ingredient.tempId, 'amount', parseFloat(text) || 0)
                  }
                  placeholder="양"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.flex1]}
                  value={ingredient.unit}
                  onChangeText={(text) => updateIngredient(ingredient.tempId, 'unit', text)}
                  placeholder="단위"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
            <Text style={styles.addButtonText}>+ 재료 추가</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>조리 순서 *</Text>
          {instructions.map((instruction) => (
            <View key={instruction.tempId} style={styles.listItem}>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemNumber}>{instruction.step_number}</Text>
                {instructions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeInstruction(instruction.tempId)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={instruction.description}
                onChangeText={(text) => updateInstruction(instruction.tempId, text)}
                placeholder="조리 단계를 입력하세요"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
              />
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addInstruction}>
            <Text style={styles.addButtonText}>+ 단계 추가</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textLight} />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? '수정하기' : '저장하기'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    backgroundColor: colors.card,
    ...shadow.md,
  },
  recipeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  imagePlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  optionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  optionButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  optionButtonTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  listItem: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  listItemNumber: {
    ...typography.h4,
    color: colors.primary,
  },
  removeButton: {
    padding: spacing.xs,
  },
  removeButtonText: {
    ...typography.body,
    color: colors.error,
    fontSize: 20,
  },
  addButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadow.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});
