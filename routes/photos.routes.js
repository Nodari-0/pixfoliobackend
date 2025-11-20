const express = require("express");
const router = express.Router();
const axios = require("axios");
const Photo = require("../models/Photo.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");

// Picsum Photos - Completely FREE, no authentication required!
const PICSUM_BASE_URL = "https://picsum.photos/v2";

// Search keyword mapping for realistic search results
const SEARCH_KEYWORDS = {
    computer: ["Alejandro Escamilla", "Paul Jarvis", "Tina Rataj"],
    technology: ["Paul Jarvis", "Alejandro Escamilla"],
    business: ["Philipe Cavalcante", "Tina Rataj"],
    ocean: ["Ben Moore", "Glen Carrie"],
    nature: ["Glen Carrie", "Ben Moore", "Paul Jarvis"],
    mountain: ["Glen Carrie", "Ben Moore"],
    coffee: ["Philipe Cavalcante", "Kevin Laminto"],
    food: ["Philipe Cavalcante", "Kevin Laminto"],
    city: ["Alejandro Escamilla", "Paul Jarvis"],
    people: ["Joseph Pearson", "Jeffrey Betts"],
    art: ["Tina Rataj", "Jeffrey Betts"],
    architecture: ["Tina Rataj", "Alejandro Escamilla"],
};

// Helper function to transform Picsum data to our format
function transformPicsumPhoto(photo, searchQuery = "") {
    const baseUrl = `https://picsum.photos/id/${photo.id}`;
    // Generate realistic tags based on search query or random
    const tags = searchQuery || ["photography", "nature", "art", "landscape"].join(", ");
    
    return {
        id: photo.id,
        pexelsId: photo.id,
        width: photo.width,
        height: photo.height,
        url: photo.url,
        photographer: photo.author,
        photographer_url: photo.url,
        photographer_id: photo.id,
        avg_color: "#1a1a1a",
        src: {
            original: `${baseUrl}/${photo.width}/${photo.height}`,
            large2x: `${baseUrl}/1920/1080`,
            large: `${baseUrl}/1280/720`,
            medium: `${baseUrl}/800/600`,
            small: `${baseUrl}/400/300`,
            portrait: `${baseUrl}/600/800`,
            landscape: `${baseUrl}/800/600`,
            tiny: `${baseUrl}/200/200`,
        },
        alt: tags,
        tags: tags,
        likes: Math.floor(Math.random() * 1000) + 100,
        downloads: Math.floor(Math.random() * 5000) + 500,
        views: Math.floor(Math.random() * 10000) + 1000,
    };
}

// Helper function to save photo to database
async function savePhotoToDb(photoData) {
    try {
        const existingPhoto = await Photo.findOne({ pexelsId: photoData.id });
        
        if (existingPhoto) {
            return existingPhoto;
        }

        const newPhoto = await Photo.create({
            pexelsId: photoData.id,
            width: photoData.width,
            height: photoData.height,
            url: photoData.url,
            photographer: photoData.photographer,
            photographerUrl: photoData.photographer_url,
            photographerId: photoData.photographer_id || 0,
            avgColor: photoData.avg_color,
            src: photoData.src,
            alt: photoData.alt,
        });

        return newPhoto;
    } catch (error) {
        console.error("Error saving photo to DB:", error);
        return null;
    }
}

// GET /api/photos/curated - Fetch curated photos from Picsum
router.get("/curated", async (req, res, next) => {
    try {
        const page = req.query.page || 1;
        const perPage = Math.min(req.query.per_page || 30, 100);

        // Picsum Photos API - Get list of photos
        const response = await axios.get(`${PICSUM_BASE_URL}/list`, {
            params: {
                page,
                limit: perPage,
            },
        });

        // Transform Picsum photos to our format
        const transformedPhotos = response.data.map(photo => transformPicsumPhoto(photo, "photography, art, nature"));

        // Save photos to database (optional, async)
        transformedPhotos.forEach(photo => {
            savePhotoToDb(photo).catch(err => console.error("DB save error:", err));
        });

        res.json({
            page: parseInt(page),
            per_page: parseInt(perPage),
            total_results: 1000,
            photos: transformedPhotos,
        });
    } catch (error) {
        console.error("Error fetching curated photos:", error.message);
        res.status(500).json({ 
            message: "Error fetching photos from Picsum API.",
            error: error.message 
        });
    }
});

// GET /api/photos/search - Search photos with smart filtering
router.get("/search", async (req, res, next) => {
    try {
        const { query, page = 1, per_page = 30 } = req.query;

        if (!query) {
            return res.status(400).json({ message: "Search query is required" });
        }

        // Get photos from Picsum
        const response = await axios.get(`${PICSUM_BASE_URL}/list`, {
            params: {
                page,
                limit: 100, // Get more to filter from
            },
        });

        // Smart search: match by photographer name based on keyword
        const searchLower = query.toLowerCase();
        const matchingPhotographers = SEARCH_KEYWORDS[searchLower] || [];

        let filteredPhotos = response.data;

        // If we have matching photographers for this keyword, filter by them
        if (matchingPhotographers.length > 0) {
            filteredPhotos = response.data.filter(photo => 
                matchingPhotographers.some(photographer => 
                    photo.author.toLowerCase().includes(photographer.toLowerCase())
                )
            );
        }

        // If no matches or not enough, do a broader search
        if (filteredPhotos.length < 10) {
            filteredPhotos = response.data.filter(photo =>
                photo.author.toLowerCase().includes(searchLower) ||
                matchingPhotographers.length === 0 // Include all if no specific keyword match
            );
        }

        // If still no matches, return all photos (fallback)
        if (filteredPhotos.length === 0) {
            filteredPhotos = response.data;
        }

        // Limit to requested per_page
        const paginatedPhotos = filteredPhotos.slice(0, parseInt(per_page));

        // Transform photos with search query as tags
        const transformedPhotos = paginatedPhotos.map(photo => 
            transformPicsumPhoto(photo, `${query}, photography, professional`)
        );

        // Save photos to database (optional, async)
        transformedPhotos.forEach(photo => {
            savePhotoToDb(photo).catch(err => console.error("DB save error:", err));
        });

        res.json({
            page: parseInt(page),
            per_page: parseInt(per_page),
            total_results: filteredPhotos.length,
            photos: transformedPhotos,
        });
    } catch (error) {
        console.error("Error searching photos:", error.message);
        res.status(500).json({ 
            message: "Error searching photos",
            error: error.message 
        });
    }
});

// GET /api/photos/local-search - Search photos in local database by photographer, title, or description
router.get("/local-search", async (req, res, next) => {
    try {
        const { search, page = 1, per_page = 30 } = req.query;

        if (!search) {
            return res.status(400).json({ message: "Search term is required" });
        }

        const skip = (page - 1) * per_page;

        // Search by photographer name or alt text (description)
        const photos = await Photo.find({
            $or: [
                { photographer: { $regex: search, $options: "i" } },
                { alt: { $regex: search, $options: "i" } },
            ],
        })
            .skip(skip)
            .limit(parseInt(per_page))
            .sort({ createdAt: -1 });

        const total = await Photo.countDocuments({
            $or: [
                { photographer: { $regex: search, $options: "i" } },
                { alt: { $regex: search, $options: "i" } },
            ],
        });

        res.json({
            page: parseInt(page),
            per_page: parseInt(per_page),
            total_results: total,
            photos,
        });
    } catch (error) {
        console.error("Error searching local photos:", error.message);
        next(error);
    }
});

// GET /api/photos/:id - Get single photo details
router.get("/:id", async (req, res, next) => {
    try {
        const { id } = req.params;

        // First check local database
        const localPhoto = await Photo.findOne({ pexelsId: id });
        if (localPhoto) {
            return res.json(localPhoto);
        }

        // Fetch from Picsum API
        const response = await axios.get(`${PICSUM_BASE_URL}/list`);
        const photo = response.data.find(p => p.id === id);

        if (!photo) {
            return res.status(404).json({ message: "Photo not found" });
        }

        const transformedPhoto = transformPicsumPhoto(photo);
        
        // Save to database
        await savePhotoToDb(transformedPhoto);

        res.json(transformedPhoto);
    } catch (error) {
        console.error("Error fetching photo:", error.message);
        res.status(500).json({ 
            message: "Error fetching photo",
            error: error.message 
        });
    }
});

module.exports = router;

