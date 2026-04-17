import User from '../models/User.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';

/**
 * List all users
 */
export const listUsers = asyncHandler(async (req, res) => {
    // Return all users, but exclude passwords
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
});

/**
 * Create a new user account
 */
export const createUser = asyncHandler(async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Username, password, and role are required.' });
    }

    const userExists = await User.findOne({ username: username.toLowerCase() });
    if (userExists) {
        return res.status(400).json({ error: 'User already exists.' });
    }

    const newUser = await User.create({
        username: username.toLowerCase(),
        password,
        role: role.toUpperCase()
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    res.status(201).json(userObj);
});

/**
 * Delete a user account
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Prevent deleting the last admin or oneself? 
    // For now, keep it simple as per user request.
    const user = await User.findByIdAndDelete(id);

    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.' });
});
