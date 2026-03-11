import React from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';

const { width } = Dimensions.get('window');
// On ajuste la taille pour bien voir l'image sans prendre trop de place verticale
const IMAGE_WIDTH = Math.min(width * 0.45, 160);
const IMAGE_HEIGHT = IMAGE_WIDTH; // L'image générée est carrée, format 1:1

type PhoneIllustrationProps = {
    style?: object;
};

const PhoneIllustration: React.FC<PhoneIllustrationProps> = ({ style }) => {
    return (
        <View style={[styles.container, style]}>
            <Image
                source={require('./assets/technician_neon.png')}
                style={styles.image}
                resizeMode="contain"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10, // Réduit la marge verticale
        height: IMAGE_HEIGHT,
        // Ombre colorée (style néon discret) autour de l'illustration
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
    },
    image: {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        borderRadius: IMAGE_WIDTH / 2, // Pour que le conteneur soit parfaitement rond
    }
});

export default PhoneIllustration;
