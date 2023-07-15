const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const URLSlug = require("mongoose-slug-generator");

mongoose.plugin(URLSlug);
const Cart = new Schema(
	{
		userId: { type: String, maxLength: 50, required: true },
		productId: { type: String, maxLength: 50, required: true },
		sizeId: { type: String, maxLength: 255, required: true },
		colorId: { type: String, maxLength: 255, required: true },
		quantity: { type: Number },
		total: { type: Number },
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

module.exports = mongoose.model("Cart", Cart);
