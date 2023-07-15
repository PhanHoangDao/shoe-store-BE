const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const AutoIncrement = require("mongoose-sequence")(mongoose);

const Order = new Schema(
	{
		_id: { type: Number }, // order ID
		customerId: { type: String, maxLength: 255, required: true },
		total: { type: Number, maxLength: 255 },
		status: { type: Number },
		isRated: { type: Boolean, default: false },
		paymentMethod: {
			type: String,
			enum: ["shipCOD", "paypal"],
			default: "shipCOD",
		},
	},
	{
		_id: false,
		timestamps: true,
	}
);

// use autoincrement
Order.plugin(AutoIncrement);

module.exports = mongoose.model("order", Order);
