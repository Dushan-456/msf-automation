import User from '../models/User.mjs';

/**
 * Seeds a default admin user if no ADMIN user exists in the database.
 * Uses ADMIN_USERNAME and ADMIN_PASSWORD from environment variables.
 */
export const seedAdminUser = async () => {
    try {
        const existingAdmin = await User.findOne({ role: 'ADMIN' });

        if (existingAdmin) {
            console.log(`✅ Admin user already exists: "${existingAdmin.username}"`);
            return;
        }

        const username = process.env.ADMIN_USERNAME?.trim() || "administrator";
        const password = process.env.ADMIN_PASSWORD?.trim() || "Pgim@2026";

        const admin = new User({ username, password, role: 'ADMIN' });
        await admin.save();

        console.log(`🌱 Default admin user created: "${username}"`);
    } catch (error) {
        console.error('❌ Failed to seed admin user:', error.message);
    }
};
