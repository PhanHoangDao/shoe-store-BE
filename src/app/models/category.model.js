const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const URLSlug = require("mongoose-slug-generator");

mongoose.plugin(URLSlug);
const Category = new Schema(
	{
		typeId: { type: String, maxLength: 50 },
		name: { type: String, maxLength: 255, lowerCase: true, trim: true },
		description: { type: String, maxLength: 600 },
		slug: { type: String, slug: "name", unique: true },
	},
	{
		timestamps: true,
	}
);

// sell for category
// articleSchema.pre("save", function(next) {
//     this.slug = this.title.split(" ").join("-");
//     next();
//   });

module.exports = mongoose.model("categorie", Category);
