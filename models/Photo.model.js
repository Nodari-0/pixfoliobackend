const { Schema, model } = require("mongoose");

// Photo model represents photos fetched from Pexels API and stored in our database
// This creates a ONE-TO-MANY relationship: One photographer can have many photos
const photoSchema = new Schema(
    {
        // Photo ID from external API (Pexels/Unsplash)
        pexelsId: {
            type: Schema.Types.Mixed, // Can be String or Number
            required: true,
            unique: true,
        },
        // Photo dimensions
        width: {
            type: Number,
            required: true,
        },
        height: {
            type: Number,
            required: true,
        },
        // Photo URLs from Pexels
        url: {
            type: String,
            required: true,
        },
        photographer: {
            type: String,
            required: true,
        },
        photographerUrl: {
            type: String,
        },
        photographerId: {
            type: Schema.Types.Mixed, // Can be String or Number (Unsplash uses strings)
        },
        // Average color for placeholder/background
        avgColor: {
            type: String,
        },
        // Image source URLs (different sizes)
        src: {
            original: String,
            large2x: String,
            large: String,
            medium: String,
            small: String,
            portrait: String,
            landscape: String,
            tiny: String,
        },
        // Optional description/alt text
        alt: {
            type: String,
        },
        // Track how many times this photo was favorited
        favoriteCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Indexes for better query performance
photoSchema.index({ photographer: 1 });
photoSchema.index({ pexelsId: 1 });

const Photo = model("Photo", photoSchema);

module.exports = Photo;

