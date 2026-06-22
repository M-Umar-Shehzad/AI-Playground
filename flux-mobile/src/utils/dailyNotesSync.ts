import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import NetInfo from "@react-native-community/netinfo";

const OFFLINE_NOTES_QUEUE_KEY = "offline_notes_queue";

export interface DailyNote {
    user_id?: string;
    date: string;
    content: string;
}

export const saveDailyNote = async (
    dateStr: string,
    content: string,
    userId?: string
) => {
    // Save locally first for instantaneous UI update
    const localKey = `note_${dateStr}`;
    await AsyncStorage.setItem(localKey, content);

    const netInfo = await NetInfo.fetch();
    const isOnline = netInfo.isConnected;

    if (isOnline && userId) {
        // Push directly to Supabase
        const { error } = await supabase
            .from("daily_notes")
            .upsert(
                { user_id: userId, date: dateStr, content },
                { onConflict: "user_id,date" }
            );
        if (error) {
            console.error("Supabase note sync error:", error);
            await pushToOfflineQueue({ user_id: userId, date: dateStr, content });
        }
    } else if (userId) {
        // Queue for offline
        await pushToOfflineQueue({ user_id: userId, date: dateStr, content });
    }
};

const pushToOfflineQueue = async (note: DailyNote) => {
    try {
        const queueStr = await AsyncStorage.getItem(OFFLINE_NOTES_QUEUE_KEY);
        let queue: DailyNote[] = queueStr ? JSON.parse(queueStr) : [];
        // Remove existing note for the same date to avoid duplicates in queue
        queue = queue.filter((n) => n.date !== note.date);
        queue.push(note);
        await AsyncStorage.setItem(OFFLINE_NOTES_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error("Failed to push to offline note queue:", e);
    }
};

export const syncOfflineNotes = async (userId: string) => {
    try {
        const queueStr = await AsyncStorage.getItem(OFFLINE_NOTES_QUEUE_KEY);
        if (!queueStr) return;

        const queue: DailyNote[] = JSON.parse(queueStr);
        if (queue.length === 0) return;

        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) return;

        // Ensure user_id is set
        const notesToSync = queue.map(note => ({ ...note, user_id: userId }));

        const { error } = await supabase
            .from("daily_notes")
            .upsert(notesToSync, { onConflict: "user_id,date" });

        if (!error) {
            await AsyncStorage.removeItem(OFFLINE_NOTES_QUEUE_KEY);
        } else {
            console.error("Failed to sync offline notes:", error);
        }
    } catch (e) {
        console.error("Error in syncOfflineNotes:", e);
    }
};

export const loadDailyNote = async (dateStr: string, userId?: string): Promise<string> => {
    const localKey = `note_${dateStr}`;
    const localContent = await AsyncStorage.getItem(localKey);
    const netInfo = await NetInfo.fetch();

    // Prioritize local storage to capture un-synced offline edits
    if (localContent !== null) {
        return localContent;
    }

    if (netInfo.isConnected && userId) {
        const { data, error } = await supabase
            .from("daily_notes")
            .select("content")
            .eq("user_id", userId)
            .eq("date", dateStr)
            .single();

        if (!error && data) {
            await AsyncStorage.setItem(localKey, data.content);
            return data.content;
        }
    }

    return "";
};
