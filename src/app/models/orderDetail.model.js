const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OrderDetail = new Schema(
	{
		orderDetailId: { type: Number },
		shoeId: { type: String, maxLength: 255 },
		sizeId: { type: String, maxLength: 255 },
		colorId: { type: String, maxLength: 255 },
		quantity: { type: Number, maxLength: 255 },
		price: { type: Number },
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model("orderDetail", OrderDetail);
