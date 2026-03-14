import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PersonneAnnuaire } from '../utils/annuaireService';

type PersonSelectionModalProps = {
    visible: boolean;
    personnes: PersonneAnnuaire[];
    numeroInterne: string;
    onSelect: (personne: PersonneAnnuaire) => void;
    onSkip: () => void;
};

const PersonSelectionModal: React.FC<PersonSelectionModalProps> = ({
    visible,
    personnes,
    numeroInterne,
    onSelect,
    onSkip,
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: visible ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [visible, fadeAnim]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <View style={styles.container}>
                    <View style={styles.iconRow}>
                        <MaterialIcons name="phone" size={28} color="#06B6D4" />
                    </View>
                    <Text style={styles.title}>Plusieurs personnes trouvées</Text>
                    <Text style={styles.subtitle}>Numéro interne : {numeroInterne}</Text>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {personnes.map((p, index) => (
                            <Pressable
                                key={index}
                                style={({ pressed }) => [
                                    styles.item,
                                    pressed && styles.itemPressed,
                                ]}
                                onPress={() => onSelect(p)}
                            >
                                <View style={styles.itemContent}>
                                    <Text style={styles.itemName}>{p.displayName}</Text>
                                    {!!p.affectation && (
                                        <Text style={styles.itemAffectation} numberOfLines={2}>
                                            {p.affectation}
                                        </Text>
                                    )}
                                    {!!p.telephone && (
                                        <Text style={styles.itemPhone}>{p.telephone}</Text>
                                    )}
                                </View>
                                <MaterialIcons name="chevron-right" size={20} color="#4B5563" />
                            </Pressable>
                        ))}
                    </ScrollView>

                    <Pressable
                        style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
                        onPress={onSkip}
                    >
                        <Text style={styles.skipText}>Continuer sans sélectionner</Text>
                    </Pressable>
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
        paddingHorizontal: 20,
    },
    container: {
        width: '100%',
        backgroundColor: '#111827',
        borderRadius: 24,
        padding: 24,
        maxHeight: '80%',
    },
    iconRow: {
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        color: '#F5F7FB',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 4,
    },
    subtitle: {
        color: '#06B6D4',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: '600',
    },
    list: {
        maxHeight: 300,
        marginBottom: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#182236',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
    },
    itemPressed: {
        backgroundColor: '#1F2C44',
    },
    itemContent: {
        flex: 1,
    },
    itemName: {
        color: '#F5F7FB',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    itemAffectation: {
        color: '#8B95A7',
        fontSize: 12,
        marginBottom: 2,
    },
    itemPhone: {
        color: '#06B6D4',
        fontSize: 12,
    },
    skipButton: {
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: '#182236',
    },
    skipButtonPressed: {
        backgroundColor: '#1F2C44',
    },
    skipText: {
        color: '#8B95A7',
        fontSize: 14,
        fontWeight: '500',
    },
});

export default PersonSelectionModal;
