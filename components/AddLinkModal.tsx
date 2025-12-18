// AddLinkModal component - Modal for adding new links with category suggestion
import Colors from '@/constants/Colors';
import { Category } from '@/constants/types';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLinks } from '@/hooks/useLinks';
import { getMatchingCategories, suggestCategory } from '@/utils/categoryMatcher';
import { fetchOGData, isValidUrl, normalizeUrl, OGData } from '@/utils/ogParser';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const EMOJI_LIST = ['📁', '📰', '🛒', '📖', '💼', '🎮', '🎵', '🎬', '📷', '✈️', '🍔', '💡', '🔧', '📱', '💻'];

interface AddLinkModalProps {
    visible: boolean;
    onClose: () => void;
}

export function AddLinkModal({ visible, onClose }: AddLinkModalProps) {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const { addLink, addCategory, categories } = useLinks();

    const [url, setUrl] = useState('');
    const [customTitle, setCustomTitle] = useState(''); // User-editable title
    const [customThumbnail, setCustomThumbnail] = useState(''); // User-editable thumbnail
    const [ogData, setOgData] = useState<OGData | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>(''); // empty = will use uncategorized in addLink
    const [suggestedCategories, setSuggestedCategories] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Inline category creation
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('📁');

    // Public/Private toggle (default: private, persisted)
    const [isPublic, setIsPublic] = useState(false);

    // Load saved public setting on mount
    useEffect(() => {
        AsyncStorage.getItem('addLink_isPublic').then(value => {
            if (value !== null) {
                setIsPublic(value === 'true');
            }
        });
    }, []);

    // Save public setting when it changes
    useEffect(() => {
        AsyncStorage.setItem('addLink_isPublic', isPublic ? 'true' : 'false');
    }, [isPublic]);


    // Reset state when modal closes
    useEffect(() => {
        if (!visible) {
            setUrl('');
            setCustomTitle('');
            setCustomThumbnail('');
            setOgData(null);
            setSelectedCategory(''); // empty = will use uncategorized in addLink
            setSuggestedCategories([]);
            setIsLoading(false);
            setError(null);
            setIsAddingCategory(false);
            setNewCategoryName('');
            setSelectedEmoji('📁');
            // NOTE: isPublic is NOT reset - it persists across sessions
        }
    }, [visible]);

    // Fetch OG data when URL changes
    useEffect(() => {
        const fetchData = async () => {
            if (!url.trim()) {
                setOgData(null);
                return;
            }

            const normalizedUrl = normalizeUrl(url.trim());
            if (!isValidUrl(normalizedUrl)) {
                setError('올바른 URL을 입력해주세요');
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const data = await fetchOGData(normalizedUrl);
                setOgData(data);
                setCustomThumbnail(data.image || ''); // Auto-fill thumbnail

                // Get category suggestions
                const matches = getMatchingCategories(data.title, normalizedUrl, categories);
                setSuggestedCategories(matches);

                // Auto-select the best match
                const suggested = suggestCategory(data.title, normalizedUrl, categories);
                setSelectedCategory(suggested);
            } catch (err) {
                setError('링크 정보를 가져올 수 없습니다');
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchData, 500);
        return () => clearTimeout(timer);
    }, [url, categories]);

    const handleSave = async () => {
        if (!ogData) return;

        const normalizedUrl = normalizeUrl(url.trim());

        await addLink({
            url: normalizedUrl,
            ogTitle: ogData.title,
            customTitle: customTitle.trim() || undefined, // Only save if user entered a custom title
            ogImage: customThumbnail.trim() || ogData.image, // Use custom if set, otherwise OG
            ogDescription: ogData.description,
            categoryId: selectedCategory,
            isFavorite: false,
            isPublic: isPublic,
        });

        onClose();
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;

        const newCat = await addCategory({
            name: newCategoryName.trim(),
            icon: selectedEmoji,
            keywords: [],
        });

        setSelectedCategory(newCat.id);
        setIsAddingCategory(false);
        setNewCategoryName('');
        setSelectedEmoji('📁');
    };

    const getCategoryById = (id: string): Category | undefined => {
        return categories.find((c) => c.id === id);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior="padding"
                style={styles.overlay}
                keyboardVerticalOffset={Platform.OS === 'android' ? -200 : 0}
            >
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>링크 추가</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* URL Input */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>URL</Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.card,
                                    color: colors.text,
                                    borderColor: error ? '#FF4444' : colors.border,
                                },
                            ]}
                            placeholder="https://example.com"
                            placeholderTextColor={colors.textSecondary}
                            value={url}
                            onChangeText={setUrl}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                        />
                        {error && <Text style={styles.errorText}>{error}</Text>}

                        {/* Loading */}
                        {isLoading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color={colors.accent} size="large" />
                                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                                    링크 정보를 가져오는 중...
                                </Text>
                            </View>
                        )}

                        {/* OG Preview */}
                        {ogData && !isLoading && (
                            <>
                                <View style={[styles.preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Image
                                        source={{ uri: customThumbnail.trim() || ogData.image }}
                                        style={styles.previewImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.previewContent}>
                                        <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={2}>
                                            {ogData.title}
                                        </Text>
                                        {ogData.description && (
                                            <Text style={[styles.previewDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                                                {ogData.description}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Custom Title Input */}
                                <View style={{ marginTop: 16 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                                        제목 수정 (선택사항)
                                    </Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor: colors.card,
                                                color: colors.text,
                                                borderColor: colors.border,
                                            },
                                        ]}
                                        placeholder={ogData.title}
                                        placeholderTextColor={colors.textSecondary}
                                        value={customTitle}
                                        onChangeText={setCustomTitle}
                                    />
                                    <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                                        비워두면 원본 제목이 사용됩니다
                                    </Text>
                                </View>

                                {/* Thumbnail URL Input */}
                                <View style={{ marginTop: 16 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>썸네일 URL</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                backgroundColor: colors.card,
                                                color: colors.text,
                                                borderColor: colors.border,
                                            },
                                        ]}
                                        placeholder="썸네일 URL (자동 입력됨, 수정 가능)"
                                        placeholderTextColor={colors.textSecondary}
                                        value={customThumbnail}
                                        onChangeText={setCustomThumbnail}
                                    />
                                </View>
                            </>
                        )}

                        {/* Category Selection */}
                        {ogData && !isLoading && (
                            <>
                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>
                                    카테고리
                                </Text>

                                {/* All Categories + Add Button */}
                                <View style={styles.categoryChips}>
                                    {categories
                                        .filter((c) =>
                                            c.id !== '00000000-0000-0000-0000-000000000001' && // favorites
                                            c.id !== '00000000-0000-0000-0000-000000000005'    // uncategorized (hidden)
                                        )

                                        .map((cat) => (
                                            <TouchableOpacity
                                                key={cat.id}
                                                style={[
                                                    styles.categoryChip,
                                                    {
                                                        backgroundColor: selectedCategory === cat.id ? colors.accent : colors.card,
                                                        borderColor: selectedCategory === cat.id ? colors.accent : colors.border,
                                                    },
                                                ]}
                                                onPress={() => setSelectedCategory(cat.id)}
                                            >
                                                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                                <Text
                                                    style={[
                                                        styles.categoryName,
                                                        { color: selectedCategory === cat.id ? '#000' : colors.text },
                                                    ]}
                                                >
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}

                                    {/* Add Category Button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.addCategoryChip,
                                            { borderColor: colors.accent },
                                        ]}
                                        onPress={() => setIsAddingCategory(!isAddingCategory)}
                                    >
                                        <Ionicons name={isAddingCategory ? 'close' : 'add'} size={16} color={colors.accent} />
                                        <Text style={[styles.categoryName, { color: colors.accent }]}>
                                            {isAddingCategory ? '취소' : '추가'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Inline Add Category Form */}
                                {isAddingCategory && (
                                    <View style={[styles.inlineAddForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={[styles.inlineLabel, { color: colors.textSecondary }]}>아이콘</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
                                            {EMOJI_LIST.map((emoji) => (
                                                <TouchableOpacity
                                                    key={emoji}
                                                    style={[
                                                        styles.emojiButton,
                                                        {
                                                            backgroundColor: selectedEmoji === emoji ? colors.accent : colors.background,
                                                            borderColor: selectedEmoji === emoji ? colors.accent : colors.border,
                                                        },
                                                    ]}
                                                    onPress={() => setSelectedEmoji(emoji)}
                                                >
                                                    <Text style={styles.emoji}>{emoji}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>

                                        <Text style={[styles.inlineLabel, { color: colors.textSecondary, marginTop: 12 }]}>이름</Text>
                                        <View style={styles.inlineInputRow}>
                                            <TextInput
                                                style={[styles.inlineInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                                placeholder="카테고리 이름"
                                                placeholderTextColor={colors.textSecondary}
                                                value={newCategoryName}
                                                onChangeText={setNewCategoryName}
                                            />
                                            <TouchableOpacity
                                                style={[styles.inlineAddButton, { backgroundColor: colors.accent }]}
                                                onPress={handleAddCategory}
                                            >
                                                <Ionicons name="checkmark" size={20} color="#000" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </>
                        )}



                        <View style={{ height: 60 }} />
                    </ScrollView>

                    {/* Fixed Bottom with Public Toggle + Save Button */}
                    <View style={[styles.bottomButtonContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                        {/* Public Toggle */}
                        {ogData && (
                            <View style={[styles.publicToggleContainer, { borderColor: colors.border, marginBottom: 12 }]}>
                                <View style={styles.publicToggleContent}>
                                    <Ionicons
                                        name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                                        size={20}
                                        color={colors.text}
                                    />
                                    <View style={styles.publicToggleText}>
                                        <Text style={[styles.publicToggleTitle, { color: colors.text }]}>
                                            {isPublic ? '공개' : '비공개'}
                                        </Text>
                                        <Text style={[styles.publicToggleDesc, { color: colors.textSecondary }]}>
                                            {isPublic ? '탐색 탭에 표시됩니다' : '나만 볼 수 있습니다'}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.toggleSwitch,
                                        { backgroundColor: isPublic ? colors.accent : colors.border }
                                    ]}
                                    onPress={() => setIsPublic(!isPublic)}
                                >
                                    <View style={[
                                        styles.toggleKnob,
                                        { transform: [{ translateX: isPublic ? 20 : 0 }] }
                                    ]} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={!ogData || isLoading}
                            style={[
                                styles.bottomSaveButton,
                                { backgroundColor: ogData && !isLoading ? colors.accent : colors.border },
                            ]}
                        >
                            <Text style={styles.bottomSaveButtonText}>저장</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        minHeight: '60%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    saveButtonText: {
        color: '#000',
        fontWeight: '600',
        fontSize: 14,
    },
    bottomButtonContainer: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 24,
    },
    bottomSaveButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomSaveButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 17,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
    },
    errorText: {
        color: '#FF4444',
        fontSize: 12,
        marginTop: 6,
    },
    helperText: {
        fontSize: 11,
        marginTop: 4,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    preview: {
        marginTop: 16,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: 160,
        backgroundColor: '#1a1a1a',
    },
    previewContent: {
        padding: 12,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    previewDescription: {
        fontSize: 13,
        lineHeight: 18,
    },
    suggestedContainer: {
        marginBottom: 12,
    },
    suggestedLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    categoryChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    addCategoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    categoryIcon: {
        fontSize: 16,
        marginRight: 6,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '500',
    },
    inlineAddForm: {
        marginTop: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    inlineLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 8,
    },
    emojiScroll: {
        flexDirection: 'row',
    },
    emojiButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    emoji: {
        fontSize: 18,
    },
    inlineInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inlineInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    inlineAddButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    publicToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        marginTop: 0,
    },
    publicToggleContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    publicToggleText: {
        gap: 2,
    },
    publicToggleTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    publicToggleDesc: {
        fontSize: 12,
    },
    toggleSwitch: {
        width: 50,
        height: 30,
        borderRadius: 15,
        padding: 3,
    },
    toggleKnob: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
    },
});

