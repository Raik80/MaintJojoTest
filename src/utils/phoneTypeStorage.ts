import { supabase } from './supabaseClient';

export type PhoneType = 'SIP' | 'Numérique';

export type PhoneInfo = {
    type: PhoneType;
    switch?: string;
    port?: string;
    prise?: string;
};

export const getPhoneInfo = async (numero: string): Promise<PhoneInfo | null> => {
    const { data, error } = await supabase
        .from('phone_types')
        .select('type, switch, port, prise')
        .eq('numero_interne', numero)
        .single();

    if (error || !data) return null;
    return {
        type: data.type as PhoneType,
        switch: data.switch || undefined,
        port: data.port || undefined,
        prise: data.prise || undefined,
    };
};

export const setPhoneType = async (numero: string, type: PhoneType): Promise<void> => {
    await supabase
        .from('phone_types')
        .upsert({ numero_interne: numero, type }, { onConflict: 'numero_interne' });
};

export const convertirEnSIP = async (
    numero: string,
    infos: { switch: string; port: string; prise: string }
): Promise<void> => {
    await supabase
        .from('phone_types')
        .upsert(
            { numero_interne: numero, type: 'SIP', switch: infos.switch, port: infos.port, prise: infos.prise },
            { onConflict: 'numero_interne' }
        );
};
