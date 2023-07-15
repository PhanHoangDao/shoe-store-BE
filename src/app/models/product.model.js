const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const URLSlug = require("mongoose-slug-generator");

mongoose.plugin(URLSlug);
const Product = new Schema({
	name: { type: String, maxLength: 255 },
	introduce: { type: String },
	description: { type: String },
	slug: { type: String, slug: "name", unique: true },
	gender: {
		type: String,
		enum: ["male", "female"],
		default: "male",
	},
	commentAndRate: { type: Array, default: [] },
});

module.exports = mongoose.model("Product", Product);
