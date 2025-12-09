// LinkViewer component - Displays link in embedded webview/iframe
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useColorScheme,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Link } from '@/constants/types';

// Only import WebView on native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
    WebView = require('react-native-webview').WebView;
}

interface LinkViewerProps {
    link: Link | null;
    onClose: () => void;
}

export function LinkViewer({ link, onClose }: LinkViewerProps) {
    const colorScheme = useColorScheme() ?? 'dark';
    const colors = Colors[colorScheme];
    const [isLoading, setIsLoading] = useState(true);

    if (!link) return null;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={onClose} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                        {link.ogTitle}
                    </Text>
                    <Text style={[styles.url, { color: colors.textSecondary }]} numberOfLines={1}>
                        {new URL(link.url).hostname.replace('www.', '')}
                    </Text>
                </View>
                <TouchableOpacity style={styles.menuButton}>
                    <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            {/* Content - Platform specific */}
            {Platform.OS === 'web' ? (
                // Web: Use iframe
                <View style={styles.webview}>
                    {isLoading && (
                        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                            <ActivityIndicator size="large" color={colors.accent} />
                        </View>
                    )}
                    <iframe
                        src={link.url}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                        }}
                        onLoad={() => setIsLoading(false)}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                </View>
            ) : (
                // Native: Use WebView
                WebView && (
                    <WebView
                        source={{ uri: link.url }}
                        style={styles.webview}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                                <ActivityIndicator size="large" color={colors.accent} />
                            </View>
                        )}
                    />
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 50,
        paddingBottom: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    url: {
        fontSize: 12,
        marginTop: 2,
    },
    menuButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
});
