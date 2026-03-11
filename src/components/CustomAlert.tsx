import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export type AlertType = 'success' | 'danger' | 'warning' | 'info';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    type?: AlertType;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
    visible,
    title,
    message,
    type = 'info',
    confirmText = 'OK',
    cancelText = 'Annuler',
    onConfirm,
    onCancel,
}) => {
    const [fadeAnim] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const getConfig = () => {
        switch (type) {
            case 'success':
                return { icon: 'check-circle', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' };
            case 'danger':
                return { icon: 'delete-outline', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)' };
            case 'warning':
                return { icon: 'warning', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' };
            case 'info':
            default:
                return { icon: 'info-outline', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)' };
        }
    };

    const config = getConfig();

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel || onConfirm}
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <View style={styles.alertBox}>
                    {/* Icon Header */}
                    <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
                        <MaterialIcons name={config.icon as any} size={32} color={config.color} />
                    </View>

                    {/* Text Content */}
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    {/* Actions */}
                    <View style={styles.buttonContainer}>
                        {onCancel && (
                            <Pressable
                                onPress={onCancel}
                                style={({ pressed }) => [
                                    styles.button,
                                    styles.cancelButton,
                                    pressed && styles.cancelButtonPressed,
                                ]}
                            >
                                <Text style={styles.cancelText}>{cancelText}</Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={onConfirm}
                            style={({ pressed }) => [
                                styles.button,
                                styles.confirmButton,
                                { backgroundColor: type === 'danger' ? '#EF4444' : '#10B981' },
                                pressed && styles.confirmButtonPressed,
                            ]}
                        >
                            <Text style={styles.confirmText}>{confirmText}</Text>
                        </Pressable>
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(5, 11, 20, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertBox: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#111827',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1F2937',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#F9FAFB',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        color: '#9CA3AF',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#1F2937',
    },
    cancelButtonPressed: {
        backgroundColor: '#374151',
    },
    confirmButton: {
        backgroundColor: '#10B981',
    },
    confirmButtonPressed: {
        opacity: 0.8,
    },
    cancelText: {
        color: '#D1D5DB',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CustomAlert;
