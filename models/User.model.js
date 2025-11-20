const { Schema, model } = require("mongoose");

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Username is required."],
            trim: true,
            minlength: 3,
        },
        email: {
            type: String,
            required: [true, "Email is required."],
            unique: true,
            lowercase: true,
            trim: true,
            // 🌟 Updated to use the stricter, anchored regex from the route file.
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Provide a valid email address."],
        },
        password: {
            type: String,
            required: [true, "Password is required."],
        },
    },
    { timestamps: true }
);

const User = model("User", userSchema);

module.exports = User;
