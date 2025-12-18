// CategoryManagementModal - Add, edit, delete, reorder categories with drag handle
import Colors from '@/constants/Colors';
import { Category } from '@/constants/types';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLinks } from '@/hooks/useLinks';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface CategoryManagementModalProps {
    visible: boolean;
    onClose: () => void;
}

const EMOJI_LIST = ['📁', '📰', '🛒', '📖', '💼', '🎮', '🎵', '🎬', '📷', '✈️', '🍔', '💡', '🔧', '📱', '💻', '🎨', '📚', '🏠', '🎯', '⭐'];

export function CategoryManagementModal({ visible, onClose }: CategoryManagementModalProps) {
    const { effectiveTheme } = useAppSettings();
    const colors = Colors[effectiveTheme];
    const { categories, addCategory, deleteCategory, reorderCategories } = useLinks();

    const [localCategories, setLocalCategories] = useState<Category[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('📁');
    const [isAdding, setIsAdding] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Sync with global categories when modal opens
    // Exclude favorites category (now handled as filter, not a category)
    useEffect(() => {
        if (visible) {
            // Filter out any favorites category (by id or name)
            const filteredCategories = categories.filter(c =>
                c.id !== 'favorites' && c.name !== '즐겨찾기'
            );
            setLocalCategories(filteredCategories);
        }
    }, [visible, categories]);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            if (Platform.OS === 'web') {
                alert('카테고리 이름을 입력해주세요');
            } else {
                Alert.alert('오류', '카테고리 이름을 입력해주세요');
            }
            return;
        }

        const newCat = await addCategory({
            name: newCategoryName.trim(),
            icon: selectedEmoji,
            keywords: [],
        });

        setLocalCategories([...localCategories, newCat]);
        setNewCategoryName('');
        setSelectedEmoji('📁');
        setIsAdding(false);
    };

    const handleDeleteCategory = (category: Category) => {
        if (category.id === 'favorites') {
            if (Platform.OS === 'web') {
                alert('즐겨찾기는 삭제할 수 없습니다');
            } else {
                Alert.alert('오류', '즐겨찾기는 삭제할 수 없습니다');
            }
            return;
        }

        const confirmDelete = () => {
            deleteCategory(category.id);
            setLocalCategories(localCategories.filter(c => c.id !== category.id));
        };

        if (Platform.OS === 'web') {
            if (confirm(`"${category.name}" 카테고리를 삭제하시겠습니까?\n이 카테고리의 링크는 "읽어볼 글"로 이동됩니다.`)) {
                confirmDelete();
            }
        } else {
            Alert.alert(
                '카테고리 삭제',
                `"${category.name}" 카테고리를 삭제하시겠습니까?\n이 카테고리의 링크는 "읽어볼 글"로 이동됩니다.`,
                [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: confirmDelete },
                ]
            );
        }
    };

    // Drag and drop for web (skip favorites)
    const handleDragStart = (e: React.DragEvent, index: number) => {
        if (index === 0) return; // Can't drag favorites
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (targetIndex === 0) return; // Can't drop on favorites

        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (sourceIndex === 0) return; // Can't move favorites

        if (sourceIndex !== targetIndex) {
            const newOrder = [...localCategories];
            const [removed] = newOrder.splice(sourceIndex, 1);
            newOrder.splice(targetIndex, 0, removed);
            setLocalCategories(newOrder);
        }
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const handleSaveOrder = async () => {
        await reorderCategories(localCategories);
        onClose();
    };

    const handleClose = () => {
        setIsAdding(false);
        setNewCategoryName('');
        setDraggedIndex(null);
        onClose();
    };

    const renderCategoryItem = (category: Category, index: number) => {
        const isDragging = draggedIndex === index;
        const isFavorites = category.id === 'favorites';
        const canDrag = !isFavorites;

        if (Platform.OS === 'web') {
            return (
                <div
                    key={category.id}
                    draggable={canDrag}
                    onDragStart={(e) => canDrag && handleDragStart(e as any, index)}
                    onDragOver={handleDragOver as any}
                    onDrop={(e) => !isFavorites && handleDrop(e as any, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: isDragging ? colors.accent + '20' : colors.card,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderStyle: 'solid',
                        borderColor: isDragging ? colors.accent : colors.border,
                        marginBottom: 8,
                        cursor: canDrag ? 'grab' : 'default',
                        opacity: isDragging ? 0.8 : isFavorites ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                    }}
                >
                    <div style={{
                        marginRight: 10,
                        cursor: canDrag ? 'grab' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: canDrag ? 1 : 0.3,
                    }}>
                        <Ionicons name="menu" size={20} color={colors.textSecondary} />
                    </div>
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                    {isFavorites && (
                        <View style={[styles.pinnedBadge, { backgroundColor: colors.accent + '20' }]}>
                            <Text style={[styles.pinnedText, { color: colors.accent }]}>고정</Text>
                        </View>
                    )}
                    {!isFavorites && (
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteCategory(category)}
                        >
                            <Ionicons name="trash-outline" size={18} color={colors.error || '#EF4444'} />
                        </TouchableOpacity>
                    )}
                </div>
            );
        }

        // Native fallback with arrow buttons
        return (
            <View
                key={category.id}
                style={[
                    styles.categoryItem,
                    {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: isFavorites ? 0.7 : 1,
                    }
                ]}
            >
                <View style={[styles.dragHandle, { opacity: canDrag ? 1 : 0.3 }]}>
                    <Ionicons name="menu" size={20} color={colors.textSecondary} />
                </View>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>

                {isFavorites ? (
                    <View style={[styles.pinnedBadge, { backgroundColor: colors.accent + '20' }]}>
                        <Text style={[styles.pinnedText, { color: colors.accent }]}>고정</Text>
                    </View>
                ) : (
                    <View style={styles.actionButtons}>
                        <View style={styles.orderButtons}>
                            <TouchableOpacity
                                style={[styles.orderButton, { opacity: index <= 1 ? 0.3 : 1 }]}
                                onPress={() => {
                                    if (index > 1) {
                                        const newOrder = [...localCategories];
                                        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                                        setLocalCategories(newOrder);
                                    }
                                }}
                                disabled={index <= 1}
                            >
                                <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.orderButton, { opacity: index === localCategories.length - 1 ? 0.3 : 1 }]}
                                onPress={() => {
                                    if (index < localCategories.length - 1) {
                                        const newOrder = [...localCategories];
                                        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                        setLocalCategories(newOrder);
                                    }
                                }}
                                disabled={index === localCategories.length - 1}
                            >
                                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteCategory(category)}
                        >
                            <Ionicons name="trash-outline" size={18} color={colors.error || '#EF4444'} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={handleClose}>
                            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>취소</Text>
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>카테고리 관리</Text>
                        <View style={{ width: 50 }} />
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Category List with Drag Handle */}
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                            {Platform.OS === 'web' ? '드래그하여 순서 변경' : '카테고리 순서'}
                        </Text>

                        {localCategories.map((category, index) => renderCategoryItem(category, index))}

                        {/* Add New Category */}
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>
                            새 카테고리 추가
                        </Text>

                        {isAdding ? (
                            <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>아이콘 선택</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiList}>
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

                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>카테고리 이름</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    placeholder="예: 개발, 디자인, 요리..."
                                    placeholderTextColor={colors.textSecondary}
                                    value={newCategoryName}
                                    onChangeText={setNewCategoryName}
                                />

                                <View style={styles.formButtons}>
                                    <TouchableOpacity
                                        style={[styles.cancelButton, { borderColor: colors.border }]}
                                        onPress={() => {
                                            setIsAdding(false);
                                            setNewCategoryName('');
                                        }}
                                    >
                                        <Text style={[styles.cancelButtonText, { color: colors.text }]}>취소</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.saveButton, { backgroundColor: colors.accent }]}
                                        onPress={handleAddCategory}
                                    >
                                        <Text style={styles.saveButtonText}>추가</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.addButton, { borderColor: colors.accent }]}
                                onPress={() => setIsAdding(true)}
                            >
                                <Ionicons name="add" size={24} color={colors.accent} />
                                <Text style={[styles.addButtonText, { color: colors.accent }]}>새 카테고리 추가</Text>
                            </TouchableOpacity>
                        )}

                        <View style={{ height: 50 }} />
                    </ScrollView>

                    {/* Large Save Button at Bottom */}
                    <View style={styles.bottomButtonContainer}>
                        <TouchableOpacity
                            style={[styles.bottomSaveButton, { backgroundColor: colors.accent }]}
                            onPress={handleSaveOrder}
                        >
                            <Text style={styles.bottomSaveButtonText}>저장</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
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
        maxHeight: '85%',
        minHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    dragHandle: {
        marginRight: 10,
        padding: 2,
    },
    categoryIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    categoryName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    pinnedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 8,
    },
    pinnedText: {
        fontSize: 11,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    orderButtons: {
        flexDirection: 'row',
        gap: 2,
    },
    orderButton: {
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    addForm: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 8,
    },
    emojiList: {
        flexDirection: 'row',
    },
    emojiButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    emoji: {
        fontSize: 20,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },
    formButtons: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    saveButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    bottomButtonContainer: {
        padding: 20,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
    },
    bottomSaveButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomSaveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
