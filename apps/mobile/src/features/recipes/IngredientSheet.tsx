import {
  COMMON_UNITS,
  ingredientKey,
  parseQuantity,
  suggestIngredients,
  UNITS,
  type IngredientSuggestion,
  type Unit,
} from '@yumi/shared';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatNumber, formatUnit } from '@/lib/format';
import { theme } from '@/theme';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { CheckIcon, MagnifyingGlassIcon, PlusIcon, XIcon } from '@/ui/icons';
import { Text } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import type { DraftIngredient } from './types';

// Unités fréquentes d'abord, puis les autres.
const ORDERED_UNITS: Unit[] = [...COMMON_UNITS, ...UNITS.filter((u) => !COMMON_UNITS.includes(u))];

export interface IngredientSheetProps {
  /**
   * `recipe` : ingrédient d'une recette. `shopping` : article de la liste de
   * courses (articles de maison suggérés, quantité facultative par défaut).
   */
  mode?: 'recipe' | 'shopping';
  /** Remplace les titres par défaut du mode (ex. écran des essentiels). */
  titles?: { add: string; edit: string; alreadyAdded: string };
  visible: boolean;
  /** Ingrédient à modifier ; absent = ajout. */
  editing: DraftIngredient | null;
  /** Ingrédients déjà dans la recette (pour signaler les doublons). */
  existing: readonly DraftIngredient[];
  familyUsage: readonly { name: string; unit: Unit | null }[];
  onSubmit: (ingredient: Omit<DraftIngredient, 'key'>, editingKey: string | null) => void;
  /** Demande de modifier un ingrédient déjà présent (touché dans les suggestions). */
  onEditExisting: (ingredient: DraftIngredient) => void;
  onClose: () => void;
}

/**
 * Ajout d'ingrédients « au fil de l'eau » : on cherche (suggestions du
 * catalogue et des habitudes de la famille), on règle quantité et unité,
 * on ajoute… et la fenêtre reste ouverte pour l'ingrédient suivant.
 */
export function IngredientSheet(props: IngredientSheetProps) {
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      {/* Remonté à chaque ouverture : l'état repart de zéro. */}
      {props.visible ? <SheetContent {...props} /> : null}
    </Modal>
  );
}

function SheetContent({
  mode = 'recipe',
  titles,
  editing,
  existing,
  familyUsage,
  onSubmit,
  onEditExisting,
  onClose,
}: IngredientSheetProps) {
  const { t } = useTranslation(['recipes', 'shopping']);
  const shopping = mode === 'shopping';
  const labels = shopping
    ? {
        addTitle: t('shopping:sheet.addTitle'),
        editTitle: t('shopping:sheet.editTitle'),
        searchPlaceholder: t('shopping:sheet.searchPlaceholder'),
        alreadyAdded: t('shopping:sheet.alreadyAdded'),
        noQuantity: t('shopping:sheet.noQuantity'),
      }
    : {
        addTitle: t('ingredientSheet.addTitle'),
        editTitle: t('ingredientSheet.editTitle'),
        searchPlaceholder: t('ingredientSheet.searchPlaceholder'),
        alreadyAdded: t('ingredientSheet.alreadyAdded'),
        noQuantity: t('ingredientSheet.toTaste'),
      };
  if (titles) {
    labels.addTitle = titles.add;
    labels.editTitle = titles.edit;
    labels.alreadyAdded = titles.alreadyAdded;
  }
  const [step, setStep] = useState<'search' | 'details'>(editing ? 'details' : 'search');
  const [query, setQuery] = useState('');
  const [name, setName] = useState(editing?.name ?? '');
  const [quantityText, setQuantityText] = useState(
    editing?.quantity != null ? formatNumber(editing.quantity) : '',
  );
  const [unit, setUnit] = useState<Unit | null>(editing ? editing.unit : 'UNIT');
  const [toTaste, setToTaste] = useState(editing ? editing.quantity === null : false);
  const [showError, setShowError] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const searchRef = useRef<TextInput>(null);

  const existingByKey = useMemo(
    () => new Map(existing.map((ingredient) => [ingredientKey(ingredient.name), ingredient])),
    [existing],
  );
  const suggestions = useMemo(
    () => suggestIngredients(query, familyUsage, 30, { includeHousehold: shopping }),
    [query, familyUsage, shopping],
  );
  const trimmedQuery = query.trim();
  const exactMatch = suggestions.some((s) => ingredientKey(s.name) === ingredientKey(trimmedQuery));

  function choose(suggestion: Pick<IngredientSuggestion, 'name' | 'unit'>) {
    const already = existingByKey.get(ingredientKey(suggestion.name));
    if (already && !editing) {
      onEditExisting(already);
      return;
    }
    setName(suggestion.name);
    setUnit(suggestion.unit ?? 'UNIT');
    // Liste de courses : quantité facultative. Recette : « au goût » pour les pincées.
    setToTaste(shopping || suggestion.unit === 'PINCH');
    setQuantityText('');
    setShowError(false);
    setStep('details');
  }

  function submit() {
    const quantity = toTaste ? null : parseQuantity(quantityText);
    if (!toTaste && (quantity === null || unit === null)) {
      setShowError(true);
      return;
    }
    onSubmit({ name: name.trim(), quantity, unit: toTaste ? null : unit }, editing?.key ?? null);
    if (editing) return;
    // Mode ajout : on enchaîne avec l'ingrédient suivant.
    setLastAdded(name.trim());
    setQuery('');
    setStep('search');
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  const parsedQuantity = parseQuantity(quantityText) ?? 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text variant="heading" style={styles.flex} accessibilityRole="header">
            {editing ? labels.editTitle : labels.addTitle}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('ingredientSheet.done')}
            hitSlop={12}
            style={styles.close}
          >
            {editing ? (
              <XIcon size={24} color={theme.colors.text} weight="bold" />
            ) : (
              <Text variant="label" color={theme.colors.primaryStrong}>
                {t('ingredientSheet.done')}
              </Text>
            )}
          </Pressable>
        </View>

        {step === 'search' ? (
          <View style={styles.flex}>
            <View style={styles.searchBox}>
              <MagnifyingGlassIcon size={20} color={theme.colors.textMuted} />
              <TextInput
                ref={searchRef}
                value={query}
                onChangeText={setQuery}
                placeholder={labels.searchPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.searchInput}
                autoFocus
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => {
                  const first = suggestions[0];
                  if (first) choose(first);
                  else if (trimmedQuery) choose({ name: trimmedQuery, unit: 'UNIT' });
                }}
                accessibilityLabel={labels.addTitle}
              />
            </View>
            {lastAdded ? (
              <Text
                variant="caption"
                color={theme.statusColors.done.foreground}
                style={styles.added}
                accessibilityLiveRegion="polite"
              >
                {t('ingredientSheet.added', { name: lastAdded })}
              </Text>
            ) : null}
            <FlatList
              data={suggestions}
              keyExtractor={(item) => `${item.source}-${item.name}`}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              ListHeaderComponent={
                trimmedQuery && !exactMatch ? (
                  <SuggestionRow
                    title={t('ingredientSheet.createCustom', { name: trimmedQuery })}
                    icon={<PlusIcon size={20} color={theme.colors.primaryStrong} weight="bold" />}
                    onPress={() => choose({ name: trimmedQuery, unit: 'UNIT' })}
                  />
                ) : null
              }
              renderItem={({ item }) => {
                const already = existingByKey.has(ingredientKey(item.name));
                return (
                  <SuggestionRow
                    title={item.name}
                    subtitle={
                      already
                        ? labels.alreadyAdded
                        : item.source === 'family'
                          ? t('ingredientSheet.familySource')
                          : item.category
                            ? t(`categories.${item.category}`)
                            : undefined
                    }
                    icon={
                      already ? (
                        <CheckIcon
                          size={20}
                          color={theme.statusColors.done.foreground}
                          weight="bold"
                        />
                      ) : undefined
                    }
                    onPress={() => choose(item)}
                  />
                );
              }}
            />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.details} keyboardShouldPersistTaps="handled">
            <Text variant="title">{name}</Text>

            <View style={styles.field}>
              <View style={styles.unitRow}>
                <Chip
                  label={labels.noQuantity}
                  selected={toTaste}
                  onPress={() => setToTaste((value) => !value)}
                />
              </View>
            </View>

            {!toTaste ? (
              <>
                <TextField
                  label={t('ingredientSheet.quantityLabel')}
                  placeholder={t('ingredientSheet.quantityPlaceholder')}
                  value={quantityText}
                  onChangeText={(value) => {
                    setQuantityText(value);
                    setShowError(false);
                  }}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  error={showError ? t('ingredientSheet.quantityInvalid') : null}
                />
                <View style={styles.field}>
                  <Text variant="label">{t('ingredientSheet.unitLabel')}</Text>
                  <View style={styles.unitRow}>
                    {ORDERED_UNITS.map((option) => (
                      <Chip
                        key={option}
                        label={formatUnit(option, parsedQuantity)}
                        selected={unit === option}
                        onPress={() => setUnit(option)}
                      />
                    ))}
                  </View>
                </View>
              </>
            ) : null}

            <View style={styles.actions}>
              <Button
                label={editing ? t('ingredientSheet.save') : t('ingredientSheet.add')}
                onPress={submit}
              />
              <Button
                variant="ghost"
                label={t('ingredientSheet.changeIngredient')}
                onPress={() => {
                  setQuery('');
                  setStep('search');
                }}
              />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SuggestionRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string | undefined;
  icon?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color={theme.colors.textMuted}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space[6],
    paddingVertical: theme.space[4],
  },
  close: {
    minWidth: theme.touchTarget,
    minHeight: theme.touchTarget,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    marginHorizontal: theme.space[6],
    paddingHorizontal: theme.space[4],
    minHeight: theme.touchTarget + 8,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.focus,
    backgroundColor: theme.colors.surface,
  },
  searchInput: { ...theme.typography.body, flex: 1, color: theme.colors.text },
  added: { marginHorizontal: theme.space[6], marginTop: theme.space[2] },
  list: { paddingHorizontal: theme.space[6], paddingVertical: theme.space[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.touchTarget + 8,
    paddingVertical: theme.space[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowPressed: { opacity: 0.6 },
  details: { flexGrow: 1, gap: theme.space[5], paddingHorizontal: theme.space[6] },
  field: { gap: theme.space[2] },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
  actions: { gap: theme.space[2], marginTop: 'auto', paddingBottom: theme.space[4] },
});
