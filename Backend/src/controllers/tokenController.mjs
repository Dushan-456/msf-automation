import ApiToken from '../models/ApiToken.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';

/**
 * List all tokens
 */
export const listTokens = asyncHandler(async (req, res) => {
    const tokens = await ApiToken.find().sort({ createdAt: -1 });
    res.json(tokens);
});

/**
 * Create a new token
 */
export const createToken = asyncHandler(async (req, res) => {
    const { name, token } = req.body;

    if (!name || !token) {
        return res.status(400).json({ message: 'Name and Token are required' });
    }

    const newToken = await ApiToken.create({ name, token });
    res.status(201).json(newToken);
});

/**
 * Delete a token
 */
export const deleteToken = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await ApiToken.findByIdAndDelete(id);
    res.json({ message: 'Token deleted successfully' });
});

/**
 * Set a token as active, deactivating others
 */
export const activateToken = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Deactivate all
    await ApiToken.updateMany({}, { isActive: false });

    // Activate selected
    const updated = await ApiToken.findByIdAndUpdate(id, { isActive: true }, { new: true });

    if (!updated) {
        return res.status(404).json({ message: 'Token not found' });
    }

    res.json(updated);
});
