const { Schema, model } = require("mongoose");

const savedImageSchema = new Schema(
    {
        // Link the saved image back to the owning user
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Unique ID from the photo API (e.g., Pexels ID)
        externalId: {
            type: String,
            required: [true, "External photo ID is required."],
        },
        // The URL of the photo (crucial for display)
        url: {
            type: String,
            required: [true, "Photo URL is required."],
        },
        photographerName: {
            type: String,
        },
        source: {
            type: String,
            default: 'External API',
        }
    },
    { timestamps: true }
);

// Ensures a user cannot save the exact same external photo twice
savedImageSchema.index({ externalId: 1, user: 1 }, { unique: true });

const SavedImage = model("SavedImage", savedImageSchema);

module.exports = SavedImage;
