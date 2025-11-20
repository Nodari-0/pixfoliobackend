const express = require("express");
const router = express.Router();

// 1. IMPORT THE SAVEDIMAGE MODEL
const SavedImage = require("../models/SavedImage.model"); 

// Import the middleware to protect routes
const { isAuthenticated } = require("../middleware/jwt.middleware");

// GET /api/test - Simple test route
router.get("/test", (req, res, next) => {
    res.json("All good in here");
});

// GET /api/favorites - Fetches all favorited images for the authenticated user (READ)
router.get("/favorites", isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.payload._id; 
        
        // Find all SavedImage documents where the 'user' field matches the authenticated user's ID.
        const favorites = await SavedImage.find({ user: userId });

        res.status(200).json(favorites);
    } catch (error) {
        console.error("Error fetching favorites:", error);
        next(error);
    }
});

// POST /api/favorites - Creates a new SavedImage document (CREATE)
router.post("/favorites", isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.payload._id;
        // Destructure necessary data from the request body
        const { externalId, url, photographerName, source } = req.body;
        
        // --- Input Validation Check (Optional, but clean) ---
        if (!externalId || !url) {
             return res.status(400).json({ message: "Missing required fields: externalId and url." });
        }
        // --- End Validation ---

        // Create a new SavedImage document, linking it to the user
        const newSavedImage = await SavedImage.create({
            user: userId,
            externalId,
            url,
            photographerName,
            source
        });

        // Respond with the newly created saved image and 201 Created status
        res.status(201).json(newSavedImage);

    } catch(error) {
        // Handle MongoDB duplicate key error (user trying to favorite the same image twice)
        if (error.code === 11000) {
            return res.status(409).json({ message: "You have already favorited this image." });
        }
        
        // Handle Mongoose validation errors (e.g., if a field required by the model is missing)
        if (error.name === 'ValidationError') {
            // This captures errors like invalid data types or fields that failed schema validation
            return res.status(400).json({ message: error.message });
        }
        
        console.error("Error saving favorite image:", error);
        next(error);
    }
});

// DELETE /api/favorites/:imageId - Removes a SavedImage document (DELETE)
router.delete("/favorites/:imageId", isAuthenticated, async (req, res, next) => {
    try {
        const userId = req.payload._id;
        const imageId = req.params.imageId; // Get the ID from the URL parameter

        // 1. Find and delete the document, BUT ONLY if it belongs to the authenticated user.
        const deletedImage = await SavedImage.findOneAndDelete({
            _id: imageId,
            user: userId // CRITICAL SECURITY CHECK: Ensure the owner is the requester
        });

        if (!deletedImage) {
            // If deletedImage is null, it means either the ID was invalid OR the user didn't own it.
            return res.status(404).json({ message: "Image not found or unauthorized to delete." });
        }

        // 2. Respond with a 204 No Content status, which is standard for successful deletions.
        res.sendStatus(204);

    } catch (error) {
        console.error("Error deleting favorite image:", error);
        // If the provided imageId is not a valid MongoDB ObjectId format, Mongoose throws a CastError.
        if (error.name === 'CastError') {
             return res.status(400).json({ message: "Invalid image ID format." });
        }
        next(error);
    }
});

module.exports = router;
