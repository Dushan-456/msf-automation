import mongoose from 'mongoose';

const apiTokenSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    token: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const ApiToken = mongoose.model('ApiToken', apiTokenSchema);

export default ApiToken;
