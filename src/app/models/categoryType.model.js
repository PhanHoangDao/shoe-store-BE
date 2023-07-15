const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CategoryType = new Schema(
	{
		type: { type: String, maxLength: 255 },
		description: { type: String, maxLength: 600 },
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

module.exports = mongoose.model("categoryType", CategoryType);
