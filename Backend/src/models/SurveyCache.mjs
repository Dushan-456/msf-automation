import mongoose from 'mongoose';

const surveyCacheSchema = new mongoose.Schema({
    smId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
        index: true // For fast regex searches
    },
    href: {
        type: String
    },
    date_modified: {
        type: Date,
        index: true // For descending sort
    },
    response_count: {
        type: Number,
        default: 0
    },
    folder_id: {
        type: String
    },
    survey_state: {
        type: String
    }
}, {
    timestamps: true
});

const SurveyCache = mongoose.model('SurveyCache', surveyCacheSchema);

export default SurveyCache;
