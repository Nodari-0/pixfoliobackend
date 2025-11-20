const { Schema, model } = require("mongoose");

const uploadedImageSchema = new Schema(
    {
        // Link the uploaded image back to the owning user
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: [true, "Image title is required."],
        },
        // *** FUTURE PROOFING ***
        // In a real app, this would be the secure path in S3/Cloud Storage
        storagePath: { 
            type: String,
            default: 'placeholder/url', 
        },
        // For now, this is a placeholder URL for display purposes
        placeholderUrl: {
            type: String,
            required: [true, "A URL is required for display."],
        },
        description: {
            type: String,
        },
        fileSize: {
            type: Number,
        },
    },
    { timestamps: true }
);

const UploadedImage = model("UploadedImage", uploadedImageSchema);

module.exports = UploadedImage;
