import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://kuacvscomudobqlhnymy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yA1kezau8Ymo_IMlclwf4Q_GZDJKUx0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
