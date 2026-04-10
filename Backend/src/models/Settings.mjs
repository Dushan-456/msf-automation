import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    value: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

const Settings = mongoose.model('Settings', settingsSchema);

/**
 * Get a setting value by key. Returns null if not found.
 */
export const getSetting = async (key) => {
    const doc = await Settings.findOne({ key });
    return doc?.value || null;
};

/**
 * Set a setting value by key (upsert).
 */
export const setSetting = async (key, value) => {
    return Settings.findOneAndUpdate(
        { key },
        { key, value },
        { upsert: true, new: true, runValidators: true }
    );
};

export default Settings;
